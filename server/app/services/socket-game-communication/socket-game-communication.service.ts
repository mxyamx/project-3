/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable no-restricted-imports */
import { ChannelDoc } from '@app/interfaces/channel-doc';
import { ChatMessageDoc } from '@app/interfaces/chat-message-doc';
import { ChatMessage } from '@common/chat-message';
import { CHANNEL_GENERAL_ID, GAME_ROOM_REGEX } from '@common/constants/chat.constants';
import { RoomMessage } from '@common/socket-data-forms';
import { Collection } from 'mongodb';
import * as io from 'socket.io';
import { CurrentGamesService } from '../current-games/current-games.service';
import { DatabaseService } from '../database/database.service';
import { ChannelMemberDoc } from '@app/interfaces/channel-member-doc';

interface UserDoc {
    _id: string; // if you use ObjectId, change to ObjectId and cast senderIds accordingly
    id: string;
    isDeleted?: boolean;
    username?: string;
    blocked?: string[];
}

export class SocketGameCommunication {
    constructor(
        private sio: io.Server,
        private databaseService: DatabaseService,
        private getFirebaseIdBySocketId: (socketId: string) => string | null,
        private gameService: CurrentGamesService,
    ) {}

    get collection(): Collection<ChatMessageDoc> {
        return this.databaseService.database.collection(process.env.CHAT_COLLECTION_NAME);
    }

    get usersCollection(): Collection<UserDoc> {
        return this.databaseService.database.collection(process.env.USER_COLLECTION_NAME ?? 'users');
    }

    get channelCollection(): Collection<ChannelDoc> {
        return this.databaseService.database.collection(process.env.CHANNEL_COLLECTION_NAME);
    }

    handleSockets(socket: io.Socket): void {
        socket.on('join-room-chat', async (roomId: string, callback) => {
            if (!GAME_ROOM_REGEX.test(roomId) && roomId !== CHANNEL_GENERAL_ID) {
                const channel = await this.channelCollection.findOne({ id: roomId });
                if (!channel) {
                    callback({ roomDeleted: true, history: [] });
                    return;
                }
            }
            if (GAME_ROOM_REGEX.test(roomId)) {
                const game = await this.gameService.getGame(roomId.split('-')[1]);
                if (!game) {
                    callback({ roomDeleted: true, history: [] });
                    return;
                }
            }
            socket.join(roomId);

            const pipeline = [
                {
                    $match: { roomId },
                },
                ...this.withOwnerLookup(),
                {
                    $sort: { timestamp: -1 },
                },
            ];
            const lastDocs = await this.collection.aggregate<ChatMessageDoc & { sender: string }>(pipeline).toArray();

            const currentFirebaseId = this.getFirebaseIdBySocketId(socket.id);

            let history: ChatMessage[] = lastDocs.reverse().map((chatMessageDoc) => {
                const chatMessage: ChatMessage = {
                    text: chatMessageDoc.text,
                    sender: chatMessageDoc.sender,
                    senderId: chatMessageDoc.senderId,
                    timestamp: chatMessageDoc.timestamp.toISOString(),
                };
                return chatMessage;
            });

            if (currentFirebaseId) {
                history = await this.filterBlockedMessages(history, currentFirebaseId);
            }
            callback({ roomDeleted: false, history });
        });

        socket.on('leave-room-chat', async (roomId: string) => {
            socket.leave(roomId);
        });

        socket.on('room-message', async (data: RoomMessage) => {
            const roomId: string = data.gameId;
            const now = new Date();

            const message: ChatMessage = {
                text: data.message.text,
                senderId: data.message.senderId,
                sender: data.message.sender,
                timestamp: now.toISOString(),
            };
            // Converting to Mongo document
            const doc: Omit<ChatMessageDoc, '_id'> = {
                text: message.text,
                senderId: message.senderId,
                roomId,
                timestamp: now,
            };

            await this.collection.insertOne(doc as ChatMessageDoc);

            const senderFirebaseId = this.getFirebaseIdBySocketId(socket.id);

            if (!senderFirebaseId) {
                this.sio.to(roomId).emit('message-sent', message);
                return;
            }

            const socketsInRoom = await this.sio.in(roomId).fetchSockets();

            for (const socketInRoom of socketsInRoom) {
                const recipientFirebaseId = this.getFirebaseIdBySocketId(socketInRoom.id);

                if (!recipientFirebaseId) {
                    socketInRoom.emit('message-sent', message);
                    continue;
                }

                if (recipientFirebaseId === senderFirebaseId) {
                    socketInRoom.emit('message-sent', message);
                } else {
                    const shouldReceive = await this.shouldReceiveMessage(senderFirebaseId, recipientFirebaseId);
                    if (shouldReceive) {
                        socketInRoom.emit('message-sent', message);
                    }
                }
            }
            await this.emitGlobalNotification(roomId, message);
        });
    }
private async emitGlobalNotification(roomId: string, message: ChatMessage): Promise<void> {
    try {
        const notification = { roomId, message };
        
        // Récupérer les sockets qui sont DÉJÀ dans la room (ils reçoivent déjà message-sent)
        const socketsInRoom = await this.sio.in(roomId).fetchSockets();
        const socketIdsInRoom = new Set(socketsInRoom.map(s => s.id));

        // Pour le chat général, notifier tout le monde SAUF ceux dans la room
        if (roomId === CHANNEL_GENERAL_ID) {
            const allSockets = await this.sio.fetchSockets();
            for (const socket of allSockets) {
                if (!socketIdsInRoom.has(socket.id)) {
                    socket.emit('chat-notification', notification);
                }
            }
            return;
        }

        // Pour les game rooms, notifier SEULEMENT les joueurs de la partie qui ne sont pas dans la room chat
        if (GAME_ROOM_REGEX.test(roomId)) {
            // Extraire le gameId du roomId (format: "GAME-1234")
            const gameId = roomId.split('-')[1];
            const game = await this.gameService.getGame(gameId);
            
            if (!game) return;

            // Récupérer les userIds des joueurs de la partie
            const playerUserIds = new Set(game.players.map(p => p.userId).filter(id => id));

            const allSockets = await this.sio.fetchSockets();
            for (const socket of allSockets) {
                // Vérifier si ce socket appartient à un joueur de la partie
                const socketUserId = this.getFirebaseIdBySocketId(socket.id);
                
                // Notifier seulement si:
                // 1. Le socket appartient à un joueur de la partie
                // 2. Le socket n'est pas déjà dans la room chat
                // 3. Ce n'est pas l'expéditeur du message
                if (socketUserId && 
                    playerUserIds.has(socketUserId) && 
                    !socketIdsInRoom.has(socket.id) &&
                    socketUserId !== message.senderId) {
                    socket.emit('chat-notification', notification);
                }
            }
            return;
        }

        // Pour les channels personnalisés, notifier les membres qui ne sont PAS dans la room
        const memberCollection: Collection<ChannelMemberDoc> = this.databaseService.database.collection(process.env.CHANNEL_MEMBERS_COLLECTION_NAME);
        const members = await memberCollection.find({ channelId: roomId }).toArray();
        
        const allSockets = await this.sio.fetchSockets();
        
        for (const member of members) {
            if (member.userId !== message.senderId) {
                // Trouver le socket de ce membre
                for (const socket of allSockets) {
                    const socketUserId = this.getFirebaseIdBySocketId(socket.id);
                    // Envoyer seulement si c'est le bon user ET qu'il n'est pas dans la room
                    if (socketUserId === member.userId && !socketIdsInRoom.has(socket.id)) {
                        socket.emit('chat-notification', { 
                            ...notification,
                            targetUserId: member.userId 
                        });
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error emitting global notification:', error);
    }
}

    private withOwnerLookup() {
        return [
            {
                $lookup: {
                    from: 'users',
                    let: { senderId: '$senderId' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$id', '$$senderId'] },
                            },
                        },
                        {
                            $project: {
                                _id: 0,
                                username: 1,
                            },
                        },
                    ],
                    as: 'ownerData',
                },
            },
            {
                $addFields: {
                    sender: { $arrayElemAt: ['$ownerData.username', 0] },
                },
            },
            {
                $project: {
                    ownerData: 0,
                },
            },
        ];
    }

    private async filterBlockedMessages(messages: ChatMessage[], currentUserId: string): Promise<ChatMessage[]> {
        try {
            const currentUser = await this.usersCollection.findOne({ id: currentUserId });
            if (!currentUser) return messages;

            const blockedByMe = currentUser.blocked || [];

            const usersWhoBlockedMe = await this.usersCollection.find({ blocked: currentUserId }, { projection: { id: 1 } }).toArray();
            const blockedMe = usersWhoBlockedMe.map((user) => user.id);

            const excludedSenderIds = new Set([...blockedByMe, ...blockedMe]);

            return messages.filter((msg) => msg.senderId === currentUserId || !excludedSenderIds.has(msg.senderId));
        } catch (error) {
            console.error('Error filtering blocked messages:', error);
            return messages;
        }
    }

    private async shouldReceiveMessage(senderId: string, recipientId: string): Promise<boolean> {
        if (senderId === recipientId) return true;

        try {
            const [sender, recipient] = await Promise.all([
                this.usersCollection.findOne({ id: senderId }),
                this.usersCollection.findOne({ id: recipientId }),
            ]);

            if (!sender || !recipient) return true;

            const senderBlockedRecipient = sender.blocked?.includes(recipientId) || false;
            const recipientBlockedSender = recipient.blocked?.includes(senderId) || false;

            return !senderBlockedRecipient && !recipientBlockedSender;
        } catch (error) {
            console.error('Error checking blocking relationship:', error);
            return true;
        }
    }
}

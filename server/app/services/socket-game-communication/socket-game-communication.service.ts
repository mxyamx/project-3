/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable no-restricted-imports */
import { ChatMessageDoc } from '@app/interfaces/chat-message-doc';
import { ChatMessage } from '@common/chat-message';
import { SocketEventNames } from '@common/enums/socket-events-names';
import { CombatLog, GameEventLog, RoomMessage } from '@common/socket-data-forms';
import { Collection } from 'mongodb';
import * as io from 'socket.io';
import { DatabaseService } from '../database/database.service';

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
    ) {}

    get collection(): Collection<ChatMessageDoc> {
        return this.databaseService.database.collection(process.env.CHAT_COLLECTION_NAME);
    }

    get usersCollection(): Collection<UserDoc> {
        return this.databaseService.database.collection(process.env.USER_COLLECTION_NAME ?? 'users');
    }

    handleSockets(socket: io.Socket): void {
        socket.on('join-room-chat', async (roomId: string) => {
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

            socket.emit(SocketEventNames.ChatHistory, history);
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
        });

        socket.on('join-room-log', async (gameId: string) => {
            socket.join(gameId);
        });

        socket.on('change-turn-log', (data: GameEventLog) => {
            const { gameId, gameEvent } = data;
            this.sio.to(gameId).emit('change-turn-log-sent', gameEvent);
        });

        socket.on('join-combat-log', async (data: CombatLog) => {
            const { gameId } = data;

            const gameIdCombat = gameId + '-combat';

            socket.join(gameIdCombat);
        });

        socket.on('combat-log', (data: GameEventLog) => {
            const { gameId, gameEvent } = data;
            const gameIdCombat = gameId + '-combat';

            this.sio.to(gameIdCombat).emit('combat-log-sent', gameEvent);
        });
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

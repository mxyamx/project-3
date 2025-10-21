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
    isDeleted?: boolean;
    username?: string;
}
export class SocketGameCommunication {
    constructor(
        private sio: io.Server,
        private databaseService: DatabaseService,
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

            const lastDocs = await this.collection
                .find({ roomId }, { projection: { _id: 0, text: 1, sender: 1, senderId: 1, timestamp: 1 } })
                .sort({ timestamp: -1 })
                .limit(100)
                .toArray();
            const senderIds = [...new Set(lastDocs.map((d) => d.senderId).filter(Boolean))];
            const users = await this.usersCollection.find({ _id: { $in: senderIds } }, { projection: { _id: 1, isDeleted: 1 } }).toArray();
            const deleted = new Set(users.filter((u) => u.isDeleted).map((u) => String(u._id)));
            const history: ChatMessage[] = lastDocs.reverse().map((chatMessageDoc) => {
                const chatMessage: ChatMessage = {
                    text: chatMessageDoc.text,
                    sender: chatMessageDoc.senderId && deleted.has(String(chatMessageDoc.senderId)) ? '[supprimé]' : chatMessageDoc.sender,
                    senderId: chatMessageDoc.senderId,
                    timestamp: chatMessageDoc.timestamp.toISOString(),
                };
                return chatMessage;
            });
            socket.emit(SocketEventNames.ChatHistory, history);
        });

        socket.on('room-message', async (data: RoomMessage) => {
            const roomId: string = data.gameId;
            const now = new Date();
            const u = await this.usersCollection.findOne({ _id: data.message.senderId }, { projection: { isDeleted: 1 } });
            const message: ChatMessage = {
                text: data.message.text,
                senderId: data.message.senderId,
                sender: u?.isDeleted ? '[supprimé]' : data.message.sender,
                timestamp: now.toISOString(),
            };
            // Converting to Mongo document
            const doc: Omit<ChatMessageDoc, '_id'> = {
                ...message,
                roomId,
                timestamp: now,
            };

            await this.collection.insertOne(doc as ChatMessageDoc);
            this.sio.to(roomId).emit('message-sent', message);
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
}

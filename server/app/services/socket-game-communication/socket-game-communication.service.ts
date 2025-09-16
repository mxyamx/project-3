import { ChatMessageDoc } from '@app/interfaces/chat-message-doc';
import { ChatMessage } from '@common/chat-message';
import { SocketEventNames } from '@common/enums/socket-events-names';
import { CombatLog, GameEventLog, RoomMessage } from '@common/socket-data-forms';
import { Collection } from 'mongodb';
import * as io from 'socket.io';
import { DatabaseService } from '../database/database.service';
export class SocketGameCommunication {
    constructor(
        private sio: io.Server,
        private databaseService: DatabaseService,
    ) {}

    get collection(): Collection<ChatMessageDoc> {
        return this.databaseService.database.collection(process.env.CHAT_COLLECTION_NAME);
    }

    handleSockets(socket: io.Socket): void {
        socket.on('join-room-chat', async (roomId: string) => {
            socket.join(roomId);

            //Document stored in Mongo
            const lastDocs = await this.collection
                .find({ roomId: roomId }, { projection: { _id: 0, text: 1, sender: 1, timestamp: 1 } })
                .sort({ timestamp: -1 })
                .limit(100)
                .toArray();
            //DTO send to client
            const history: ChatMessage[] = lastDocs.reverse().map((chatMessageDoc) => {
                const chatMessage: ChatMessage = { text: chatMessageDoc.text, sender: chatMessageDoc.sender, timestamp: chatMessageDoc.timestamp };
                return chatMessage;
            });
            socket.emit(SocketEventNames.ChatHistory, history);
        });

        socket.on('room-message', async (data: RoomMessage) => {
            const roomId: string = data.gameId;
            const message: ChatMessage = data.message;
            //Converting to Mongo document
            const doc: Omit<ChatMessageDoc, '_id'> = {
                ...message,
                roomId: roomId,
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

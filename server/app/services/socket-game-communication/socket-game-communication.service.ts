import { CombatLog, GameEventLog, RoomMessage } from '@common/socket-data-forms';
import * as io from 'socket.io';
export class SocketGameCommunication {
    private rooms: Map<string, Set<string>> = new Map();

    constructor(private sio: io.Server) {}

    handleSockets(socket: io.Socket): void {
        socket.on('join-room-chat', async (gameId: string) => {
            if (!this.rooms.has(gameId)) {
                this.rooms.set(gameId, new Set());
            }
            this.rooms.get(gameId)?.add(socket.id);
            socket.join(gameId);
        });

        socket.on('room-message', (data: RoomMessage) => {
            const { gameId, message } = data;
            if (this.rooms.has(data.gameId)) {
                this.sio.to(gameId).emit('message-sent', message);
            }
        });

        socket.on('join-room-log', async (gameId: string) => {
            if (!this.rooms.has(gameId)) {
                this.rooms.set(gameId, new Set());
            }
            this.rooms.get(gameId)?.add(socket.id);
            socket.join(gameId);
        });

        socket.on('change-turn-log', (data: GameEventLog) => {
            const { gameId, gameEvent } = data;
            if (this.rooms.has(data.gameId)) {
                this.sio.to(gameId).emit('change-turn-log-sent', gameEvent);
            }
        });

        socket.on('join-combat-log', async (data: CombatLog) => {
            const { gameId } = data;

            const gameIdCombat = gameId + '-combat';
            if (!this.rooms.has(gameIdCombat)) {
                this.rooms.set(gameIdCombat, new Set());
            }
            this.rooms.get(gameIdCombat)?.add(socket.id);
            socket.join(gameIdCombat);
        });

        socket.on('combat-log', (data: GameEventLog) => {
            const { gameId, gameEvent } = data;
            const gameIdCombat = gameId + '-combat';

            this.sio.to(gameIdCombat).emit('combat-log-sent', gameEvent);
        });
    }
}

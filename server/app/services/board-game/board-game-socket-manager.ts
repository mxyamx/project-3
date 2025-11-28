import { friendEvents } from '@app/events/friendEvents';
import { Socket, Server as SocketIOServer } from 'socket.io';

export class BoardGameSocketManager {
    constructor(private io: SocketIOServer) {
        this.setupEventListeners();
    }

    handleUserConnection(socket: Socket): void {
        socket.on('disconnect', () => {});
    }

    private setupEventListeners() {
        friendEvents.on('update-boardgame-list', async () => {
            this.io.emit('refresh-boardgame-list');
        });

        friendEvents.on('boardgame-deleted', async (payload: { id: string }) => {
            this.io.emit('remove-boardgame', payload);
        });
    }
}

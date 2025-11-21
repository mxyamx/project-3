import { UserSessionManager } from '@app/classes/user-session-manager/user-session-manager';
import { friendEvents } from '@app/events/friendEvents';
import { ChannelDeletedPayload } from '@app/interfaces/channel-deleted-payload';
import { ChannelEventType } from '@common/enums/channel-event-type';
import { Socket, Server as SocketIOServer } from 'socket.io';
import { DatabaseService } from '../database/database.service';

export class ChannelSocketManager {
    constructor(
        private io: SocketIOServer,
        private userSessionManager: UserSessionManager,
        private databaseService: DatabaseService,
    ) {
        this.setupEventListeners();
    }

    handleUserConnection(socket: Socket): void {
        socket.on('disconnect', () => {});
    }

    private setupEventListeners() {
        friendEvents.on(ChannelEventType.DELETED, async (payload: ChannelDeletedPayload) => {
            const sockets = payload.users.map((id) => {
                return this.userSessionManager.getUserSession(id).socketId;
            });
            const channelId = payload.roomId;

            this.io.to(channelId).emit('channel-deleted', { channelId });

            this.io.in(channelId).socketsLeave(channelId);

            if (sockets && sockets.length > 0) {
                for (const s of sockets) {
                    this.io.to(s).emit('channel-removed', { channelId });
                }
            }

            try {
                await this.databaseService.database.collection(process.env.CHAT_COLLECTION_NAME).deleteMany({ roomId: channelId });
            } catch (error) {
                console.warn(`Impossible de supprimer les messages du chat pour ${channelId} (ignoré).`);
            }
        });
    }
}

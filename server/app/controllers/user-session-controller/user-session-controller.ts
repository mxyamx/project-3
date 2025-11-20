import { UserSessionManager } from '@app/classes/user-session-manager/user-session-manager';
import { UsersService } from '@app/services/users/users.service';
import { DeviceType } from '@common/enums/deviceType';
import { Server, Socket } from 'socket.io';
import { Service } from 'typedi';

@Service()
export class UserSessionController {
    private userSessionManager: UserSessionManager;
    vpSocketIds: string[];

    constructor(
        private sio: Server,
        private usersService: UsersService,
        userSessionManager?: UserSessionManager,
    ) {
        this.userSessionManager = userSessionManager || new UserSessionManager();
        this.vpSocketIds = [];
    }

    handleUserConnection(socket: Socket): void {
        this.handleConnection(socket);
        this.handleDisconnection(socket);
        this.handleEvents(socket);
    }

    private handleConnection(socket: Socket): void {
        try {
            const firebaseId = socket.handshake.auth.userId as string;
            const deviceType = socket.handshake.auth.deviceType as DeviceType;

            if (!firebaseId) {
                console.error('No firebase ID provided');
                socket.emit('connection-error', {
                    message: 'Authentication required',
                    code: 'NO_AUTH',
                });
                socket.disconnect();
                return;
            }
            socket.data.userId = firebaseId;

            if (this.userSessionManager.isUserOnline(firebaseId)) {
                console.error('User already connected from another device');
                socket.emit('connection-error', {
                    message: 'User is already connected from another device',
                    code: 'ALREADY_ONLINE',
                });
                socket.disconnect();
                return;
            }

            const connected = this.userSessionManager.connectUser(firebaseId, socket.id, deviceType);

            if (!connected) {
                socket.emit('connection-error', {
                    message: 'Failed to connect',
                    code: 'CONNECTION_FAILED',
                });
                socket.disconnect();
                return;
            }

            socket.emit('connection-success', {
                message: 'Connected successfully',
                firebaseId,
                deviceType,
            });

            this.updateUserStatusInDB(firebaseId, deviceType).catch((error) => {
                console.error('Error updating user status in DB:', error);
            });
        } catch (error) {
            console.error('Connection error:', error);
            socket.emit('connection-error', {
                message: 'Internal server error',
                code: 'SERVER_ERROR',
            });
            socket.disconnect();
        }
    }

    private handleDisconnection(socket: Socket): void {
        socket.on('disconnect', async () => {
            const index = this.vpSocketIds.findIndex((id) => socket.id === id);
            if (index !== -1) {
                this.vpSocketIds.slice(index, 1);
                return;
            }
            try {
                const firebaseId = this.userSessionManager.disconnectBySocketId(socket.id);

                if (firebaseId) {
                    await this.updateUserStatusInDB(firebaseId, DeviceType.offline).catch((error) => {
                        console.error('Error updating user status in DB on disconnect:', error);
                    });
                }
            } catch (error) {
                console.error('Disconnect error:', error);
            }
        });
    }

    private handleEvents(socket: Socket): void {
        socket.on('check-user-status', (data: { firebaseId: string; deviceType: DeviceType }) => {
            const isOnline = this.userSessionManager.isUserOnline(data.firebaseId);
            const session = this.userSessionManager.getUserSession(data.firebaseId);

            socket.emit('user-status', {
                firebaseId: data.firebaseId,
                isOnline,
                session,
                DeviceType,
            });
        });

        socket.on('get-active-users', () => {
            const activeSessions = this.userSessionManager.getAllActiveSessions();
            const activeCount = this.userSessionManager.getActiveUserCount();

            socket.emit('active-users', {
                count: activeCount,
                sessions: activeSessions,
            });
        });

        socket.on('force-disconnect-user', (data: { firebaseId: string }) => {
            const session = this.userSessionManager.getUserSession(data.firebaseId);
            if (session) {
                const targetSocket = this.sio.sockets.sockets.get(session.socketId);
                if (targetSocket) {
                    targetSocket.disconnect();
                }
                this.userSessionManager.disconnectByFirebaseId(data.firebaseId);
            }
        });
    }

    private async updateUserStatusInDB(firebaseId: string, status: DeviceType): Promise<void> {
        try {
            const user = await this.usersService.getUser(firebaseId);
            const updatedUser = { ...user, status };
            await this.usersService.updateUser(updatedUser);
        } catch (error) {
            throw error;
        }
    }

    isUserOnline(firebaseId: string): boolean {
        return this.userSessionManager.isUserOnline(firebaseId);
    }

    getUserSession(firebaseId: string) {
        return this.userSessionManager.getUserSession(firebaseId);
    }

    disconnectUser(firebaseId: string): boolean {
        const session = this.userSessionManager.getUserSession(firebaseId);
        if (session) {
            const socket = this.sio.sockets.sockets.get(session.socketId);
            if (socket) {
                socket.disconnect();
            }
            return this.userSessionManager.disconnectByFirebaseId(firebaseId);
        }
        return false;
    }
}

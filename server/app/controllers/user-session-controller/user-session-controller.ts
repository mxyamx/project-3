import { Server, Socket } from 'socket.io';
import { UserSessionManager } from '@app/classes/user-session-manager/user-session-manager';
import { DeviceType } from '@common/enums/deviceType';
import { UsersService } from '@app/services/users/users.service';
import { Service } from 'typedi';

@Service()
export class UserSessionController {
    private userSessionManager: UserSessionManager;

    constructor(
        private sio: Server,
        private usersService: UsersService,
    ) {
        this.userSessionManager = new UserSessionManager();
        this.configureConnection();
    }

    private configureConnection(): void {
        this.sio.on('connection', (socket: Socket) => {
            this.handleConnection(socket);
            this.handleDisconnection(socket);
            this.handleEvents(socket);
        });
    }

    private handleConnection(socket: Socket): void {
        try {
            const firebaseId = socket.handshake.auth.userId as string;

            if (!firebaseId) {
                console.error('No firebase ID provided');
                socket.emit('connection-error', {
                    message: 'Authentication required',
                    code: 'NO_AUTH',
                });
                socket.disconnect();
                return;
            }

            // Check if user is already connected
            if (this.userSessionManager.isUserOnline(firebaseId)) {
                console.log(`User ${firebaseId} is already online`);
                socket.emit('connection-error', {
                    message: 'User is already connected from another device',
                    code: 'ALREADY_ONLINE',
                });
                socket.disconnect();
                return;
            }

            // Register the session
            const connected = this.userSessionManager.connectUser(
                firebaseId,
                socket.id,
                DeviceType.web
            );

            if (!connected) {
                socket.emit('connection-error', {
                    message: 'Failed to connect',
                    code: 'CONNECTION_FAILED',
                });
                socket.disconnect();
                return;
            }

            console.log(`User ${firebaseId} connected with socket ${socket.id}`);

            // Optional: Update user status in database for persistence
            this.updateUserStatusInDB(firebaseId, DeviceType.web).catch((error) => {
                console.error('Error updating user status in DB:', error);
            });

            // Emit success
            socket.emit('connection-success', {
                message: 'Connected successfully',
                firebaseId,
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
            try {
                const firebaseId = this.userSessionManager.disconnectBySocketId(socket.id);

                if (firebaseId) {
                    console.log(`User ${firebaseId} disconnected`);

                    // Optional: Update user status in database
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
        // Check user status event
        socket.on('check-user-status', (data: { firebaseId: string }) => {
            const isOnline = this.userSessionManager.isUserOnline(data.firebaseId);
            const session = this.userSessionManager.getUserSession(data.firebaseId);

            socket.emit('user-status', {
                firebaseId: data.firebaseId,
                isOnline,
                session,
            });
        });

        // Get all active users
        socket.on('get-active-users', () => {
            const activeSessions = this.userSessionManager.getAllActiveSessions();
            const activeCount = this.userSessionManager.getActiveUserCount();

            socket.emit('active-users', {
                count: activeCount,
                sessions: activeSessions,
            });
        });

        // Force disconnect a user (admin feature)
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

    // Public method to check if user is online (can be used by other controllers)
    public isUserOnline(firebaseId: string): boolean {
        return this.userSessionManager.isUserOnline(firebaseId);
    }

    // Public method to get user session
    public getUserSession(firebaseId: string) {
        return this.userSessionManager.getUserSession(firebaseId);
    }

    // Public method to disconnect user
    public disconnectUser(firebaseId: string): boolean {
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
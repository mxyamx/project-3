import { UserSessionManager } from '@app/classes/user-session-manager/user-session-manager';
import { UsersService } from '@app/services/users/users.service';
import { DeviceType } from '@common/enums/deviceType';
import { GameActivityStatus } from '@common/enums/game-activity-status';
import { UserStatusInfo } from '@common/user';
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

            // Update user status to online with idle activity
            this.updateUserStatusInDB(firebaseId, deviceType, GameActivityStatus.idle).catch((error) => {
                console.error('Error updating user status in DB:', error);
            });

            // Notify friends that user came online
            this.notifyFriendsOfStatusChange(firebaseId, deviceType, GameActivityStatus.idle).catch((error) => {
                console.error('Error notifying friends:', error);
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
                this.vpSocketIds.splice(index, 1);
                return;
            }
            try {
                const firebaseId = this.userSessionManager.disconnectBySocketId(socket.id);

                if (firebaseId) {
                    await this.updateUserStatusInDB(firebaseId, DeviceType.offline).catch((error) => {
                        console.error('Error updating user status in DB on disconnect:', error);
                    });

                    // Notify friends that user went offline
                    await this.notifyFriendsOfStatusChange(firebaseId, DeviceType.offline).catch((error) => {
                        console.error('Error notifying friends:', error);
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

        // NEW: Get statuses for multiple users at once
        socket.on('get-users-status', async (data: { userIds: string[] }) => {
            try {
                const statuses: UserStatusInfo[] = [];

                for (const userId of data.userIds) {
                    const user = await this.usersService.getUser(userId);
                    if (user) {
                        statuses.push({
                            userId: user.id,
                            username: user.username,
                            avatar: user.avatar,
                            status: user.status,
                            gameActivity: user.gameActivity,
                            gameId: user.currentGameId,
                        });
                    }
                }

                socket.emit('users-status-response', { statuses });
            } catch (error) {
                console.error('Error fetching user statuses:', error);
                socket.emit('users-status-response', { statuses: [] });
            }
        });

        socket.on('update-game-activity', async (data: { gameActivity: GameActivityStatus; gameId?: string }) => {
            const firebaseId = socket.data.userId;
            if (!firebaseId) return;

            try {
                const session = this.userSessionManager.getUserSession(firebaseId);
                if (!session) return;

                await this.updateUserStatusInDB(firebaseId, session.deviceType, data.gameActivity, data.gameId);
                await this.notifyFriendsOfStatusChange(firebaseId, session.deviceType, data.gameActivity, data.gameId);
            } catch (error) {
                console.error('Failed to update game activity:', error);
            }
        });

        socket.on('invite-to-game', async (data: { friendId: string; gameId: string }) => {
            const firebaseId = socket.data.userId;
            if (!firebaseId) return;

            try {
                const user = await this.usersService.getUser(firebaseId);
                const friend = await this.usersService.getUser(data.friendId);

                if (!user || !friend || friend.status === DeviceType.offline) {
                    socket.emit('invite-failed', { reason: 'Friend is offline' });
                    return;
                }

                if (!user.friends?.includes(data.friendId)) {
                    socket.emit('invite-failed', { reason: 'Not friends' });
                    return;
                }

                const friendSocketId = this.userSessionManager.getSocketIdByFirebaseId(data.friendId);
                if (friendSocketId) {
                    this.sio.to(friendSocketId).emit('game-invite-received', {
                        from: user.username,
                        fromId: user.id,
                        fromAvatar: user.avatar,
                        gameId: data.gameId,
                    });
                    socket.emit('invite-sent', { success: true });
                }
            } catch (error) {
                console.error('Failed to send game invitation:', error);
                socket.emit('invite-failed', { reason: 'Server error' });
            }
        });

        socket.on('accept-game-invite', async (data: { gameId: string; inviterId: string }) => {
            const userId = socket.data.userId;
            if (!userId) return;

            try {
                const user = await this.usersService.getUser(userId);

                const inviterSocketId = this.userSessionManager.getSocketIdByFirebaseId(data.inviterId);
                if (inviterSocketId && user) {
                    this.sio.to(inviterSocketId).emit('invite-accepted', {
                        userId: user.id,
                        username: user.username,
                        avatar: user.avatar,
                        gameId: data.gameId,
                    });
                }
            } catch (error) {
                console.error('Error handling invite acceptance:', error);
            }
        });

        socket.on('decline-game-invite', async (data: { gameId: string; inviterId: string }) => {
            const userId = socket.data.userId;
            if (!userId) return;

            try {
                const user = await this.usersService.getUser(userId);

                const inviterSocketId = this.userSessionManager.getSocketIdByFirebaseId(data.inviterId);
                if (inviterSocketId && user) {
                    this.sio.to(inviterSocketId).emit('invite-declined', {
                        userId: user.id,
                        username: user.username,
                        gameId: data.gameId,
                    });
                }
            } catch (error) {
                console.error('Error handling invite decline:', error);
            }
        });
    }

    private async updateUserStatusInDB(firebaseId: string, status: DeviceType, gameActivity?: GameActivityStatus, gameId?: string): Promise<void> {
        try {
            const user = await this.usersService.getUser(firebaseId);
            const updatedUser = {
                ...user,
                status,
                gameActivity: status === DeviceType.offline ? undefined : gameActivity,
                currentGameId: status === DeviceType.offline ? undefined : gameId,
            };
            await this.usersService.updateUser(updatedUser);
        } catch (error) {
            throw error;
        }
    }

    private async notifyFriendsOfStatusChange(
        firebaseId: string,
        status: DeviceType,
        gameActivity?: GameActivityStatus,
        gameId?: string,
    ): Promise<void> {
        try {
            const user = await this.usersService.getUser(firebaseId);
            if (!user || !user.friends || user.friends.length === 0) return;

            for (const friendId of user.friends) {
                const friendSocketId = this.userSessionManager.getSocketIdByFirebaseId(friendId);
                if (friendSocketId) {
                    this.sio.to(friendSocketId).emit('user-game-activity-changed', {
                        userId: user.id,
                        username: user.username,
                        avatar: user.avatar,
                        status,
                        gameActivity,
                        gameId,
                    });
                }
            }
        } catch (error) {
            console.error('Error notifying friends:', error);
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

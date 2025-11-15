import { UserSessionManager } from '@app/classes/user-session-manager/user-session-manager';
import { friendEvents } from '@app/events/friendEvents';
import { FriendEventType } from '@common/enums/friend-event-type';
import { Socket, Server as SocketIOServer } from 'socket.io';

export class FriendSocketManager {
    constructor(
        private io: SocketIOServer,
        private userSessionManager: UserSessionManager,
    ) {
        this.setupEventListeners();
    }

    handleUserConnection(socket: Socket): void {
        socket.on('disconnect', () => {});
    }

    private setupEventListeners(): void {
        friendEvents.on(FriendEventType.REQUEST_SENT, (payload) => {
            const receiverSession = this.userSessionManager.getUserSession(payload.request.receiverId);

            if (receiverSession) {
                this.io.to(receiverSession.socketId).emit('friend-request-received', payload.request);
            }
        });

        friendEvents.on(FriendEventType.REQUEST_ACCEPTED, (payload) => {
            const senderSession = this.userSessionManager.getUserSession(payload.senderId);
            const receiverSession = this.userSessionManager.getUserSession(payload.receiverId);

            if (senderSession) {
                this.io.to(senderSession.socketId).emit('friend-added', {
                    friend: payload.receiverData,
                });
            }

            if (receiverSession) {
                this.io.to(receiverSession.socketId).emit('friend-added', {
                    friend: payload.senderData,
                });
            }
        });

        friendEvents.on(FriendEventType.REQUEST_REJECTED, (payload) => {
            const senderSession = this.userSessionManager.getUserSession(payload.senderId);

            if (senderSession) {
                this.io.to(senderSession.socketId).emit('friend-request-rejected', {
                    requestId: payload.requestId,
                });
            }
        });

        friendEvents.on(FriendEventType.FRIEND_REMOVED, (payload) => {
            const userSession = this.userSessionManager.getUserSession(payload.userId);
            const friendSession = this.userSessionManager.getUserSession(payload.friendId);

            if (userSession) {
                this.io.to(userSession.socketId).emit('friend-removed', {
                    friendId: payload.friendId,
                });
            }

            if (friendSession) {
                this.io.to(friendSession.socketId).emit('friend-removed', {
                    friendId: payload.userId,
                });
            }
        });

        friendEvents.on(FriendEventType.USER_BLOCKED, (payload) => {
            const blockedSession = this.userSessionManager.getUserSession(payload.blockedUserId);

            if (blockedSession) {
                this.io.to(blockedSession.socketId).emit('user-blocked-you', {
                    blockerId: payload.blockerId,
                });
            }
        });

        friendEvents.on(FriendEventType.USER_UNBLOCKED, (payload) => {
            const unblockedSession = this.userSessionManager.getUserSession(payload.unblockedUserId);

            if (unblockedSession) {
                this.io.to(unblockedSession.socketId).emit('user-unblocked-you', {
                    unblockerId: payload.unblockerId,
                });
            }
        });
    }
}

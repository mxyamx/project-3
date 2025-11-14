// socket/friendSocketManager.ts
import { UserSessionManager } from '@app/classes/user-session-manager/user-session-manager';
import { friendEvents, FriendEventType } from '@app/events/friendEvents';
import { Socket, Server as SocketIOServer } from 'socket.io';

export class FriendSocketManager {
    constructor(
        private io: SocketIOServer,
        private userSessionManager: UserSessionManager,
    ) {
        this.setupEventListeners();
    }

    handleUserConnection(socket: Socket): void {
        // UserSessionManager already handles the mapping, so we just need to listen for friend events
        socket.on('disconnect', () => {
            console.log(`❌ Socket ${socket.id} disconnected from friends`);
        });
    }

    private setupEventListeners(): void {
        console.log('🔌 FriendSocketManager: Setting up event listeners...');

        friendEvents.on(FriendEventType.REQUEST_SENT, (payload) => {
            console.log('📤 Backend: REQUEST_SENT event received');
            console.log('   Payload:', payload);

            const receiverSession = this.userSessionManager.getUserSession(payload.request.receiverId);
            console.log('   Receiver ID:', payload.request.receiverId);
            console.log('   Receiver session:', receiverSession);

            if (receiverSession) {
                console.log('   ✉️ Emitting friend-request-received to socket:', receiverSession.socketId);
                this.io.to(receiverSession.socketId).emit('friend-request-received', payload.request);
                console.log('   ✅ Event emitted');
            } else {
                console.log('   ⚠️ Receiver not online or session not found');
            }
        });

        friendEvents.on(FriendEventType.REQUEST_ACCEPTED, (payload) => {
            console.log('✅ Backend: REQUEST_ACCEPTED event received');
            console.log('   Sender ID:', payload.senderId);
            console.log('   Receiver ID:', payload.receiverId);

            const senderSession = this.userSessionManager.getUserSession(payload.senderId);
            const receiverSession = this.userSessionManager.getUserSession(payload.receiverId);

            console.log('   Sender session:', senderSession);
            console.log('   Receiver session:', receiverSession);

            if (senderSession) {
                console.log('   ✉️ Emitting friend-added to sender socket:', senderSession.socketId);
                this.io.to(senderSession.socketId).emit('friend-added', {
                    friend: payload.receiverData,
                });
            }

            if (receiverSession) {
                console.log('   ✉️ Emitting friend-added to receiver socket:', receiverSession.socketId);
                this.io.to(receiverSession.socketId).emit('friend-added', {
                    friend: payload.senderData,
                });
            }
        });

        friendEvents.on(FriendEventType.REQUEST_REJECTED, (payload) => {
            console.log('❌ Backend: REQUEST_REJECTED event received');
            const senderSession = this.userSessionManager.getUserSession(payload.senderId);

            if (senderSession) {
                console.log('   ✉️ Emitting to sender socket:', senderSession.socketId);
                this.io.to(senderSession.socketId).emit('friend-request-rejected', {
                    requestId: payload.requestId,
                });
            }
        });

        friendEvents.on(FriendEventType.FRIEND_REMOVED, (payload) => {
            console.log('👋 Backend: FRIEND_REMOVED event received');
            const userSession = this.userSessionManager.getUserSession(payload.userId);
            const friendSession = this.userSessionManager.getUserSession(payload.friendId);

            if (userSession) {
                console.log('   ✉️ Emitting to user socket:', userSession.socketId);
                this.io.to(userSession.socketId).emit('friend-removed', {
                    friendId: payload.friendId,
                });
            }

            if (friendSession) {
                console.log('   ✉️ Emitting to friend socket:', friendSession.socketId);
                this.io.to(friendSession.socketId).emit('friend-removed', {
                    friendId: payload.userId,
                });
            }
        });

        console.log('✅ FriendSocketManager: Event listeners set up');
    }
}

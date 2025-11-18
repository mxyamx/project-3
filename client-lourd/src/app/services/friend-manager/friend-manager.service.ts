import { Injectable, signal, WritableSignal } from '@angular/core';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { FriendsService } from '@app/services/http-manager/http-friends.service';
import { FriendRequest } from '@common/friend-request';
import { User } from '@common/user';
import { Subscription } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class FriendManagerService {
    friends: WritableSignal<User[]> = signal([]);
    pendingRequests: WritableSignal<(FriendRequest & { sender: { id: string; username: string; avatar: string } })[]> = signal([]);
    sentRequests: WritableSignal<(FriendRequest & { receiver: { id: string; username: string; avatar: string } })[]> = signal([]);
    blockedUsers: WritableSignal<User[]> = signal([]);

    private socketSubscriptions: Subscription[] = [];
    private isInitialized = false;

    constructor(
        private friendsService: FriendsService,
        private socketService: SocketClientService,
    ) {}

    initialize(): void {
        if (this.isInitialized) return;

        this.loadAllData();
        this.setupSocketListeners();
        this.isInitialized = true;
    }

    cleanup(): void {
        this.socketSubscriptions.forEach((sub) => sub.unsubscribe());
        this.socketSubscriptions = [];
        this.friends.set([]);
        this.pendingRequests.set([]);
        this.sentRequests.set([]);
        this.blockedUsers.set([]);
        this.isInitialized = false;
    }

    refresh(): void {
        this.loadAllData();
    }

    private loadAllData(): void {
        this.friendsService.getFriendsList().subscribe({
            next: (friends) => this.friends.set(friends),
            error: (error) => console.error('Error loading friends:', error),
        });

        this.friendsService.getPendingRequests().subscribe({
            next: (requests) => this.pendingRequests.set(requests),
            error: (error) => console.error('Error loading pending requests:', error),
        });

        this.friendsService.getSentRequests().subscribe({
            next: (requests) => this.sentRequests.set(requests),
            error: (error) => console.error('Error loading sent requests:', error),
        });

        this.friendsService.getBlockedUsers().subscribe({
            next: (users) => this.blockedUsers.set(users),
            error: (error) => console.error('Error loading blocked users:', error),
        });
    }

    private setupSocketListeners(): void {
        const requestReceivedSub = this.socketService.listen<any>('friend-request-received').subscribe((data) => {
            const current = this.pendingRequests();
            const exists = current.some((req) => req.id === data.id);

            if (!exists) {
                this.pendingRequests.set([
                    ...current,
                    {
                        id: data.id,
                        senderId: data.senderId,
                        receiverId: data.receiverId,
                        status: 'pending' as any,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        sender: {
                            id: data.senderId,
                            username: data.senderUsername,
                            avatar: data.senderAvatar,
                        },
                    },
                ]);
            }
        });

        const friendAddedSub = this.socketService.listen<any>('friend-added').subscribe((data) => {
            const currentSent = this.sentRequests();
            this.sentRequests.set(currentSent.filter((req) => req.receiverId !== data.friend.id));

            const currentFriends = this.friends();
            const exists = currentFriends.some((f) => f.id === data.friend.id);
            if (!exists) {
                this.friends.set([...currentFriends, data.friend as User]);
            }
        });

        const requestRejectedSub = this.socketService.listen<any>('friend-request-rejected').subscribe((data) => {
            const current = this.sentRequests();
            this.sentRequests.set(current.filter((req) => req.id !== data.requestId));
        });

        const friendRemovedSub = this.socketService.listen<any>('friend-removed').subscribe((data) => {
            const current = this.friends();
            this.friends.set(current.filter((f) => f.id !== data.friendId));
        });

        // FIXED: Better handling of user-blocked-you event
        const userBlockedYouSub = this.socketService.listen<any>('user-blocked-you').subscribe((data) => {
            // Remove the blocker from friends list
            const currentFriends = this.friends();
            this.friends.set(currentFriends.filter((f) => f.id !== data.blockerId));

            // Remove any pending requests from the blocker
            const pending = this.pendingRequests();
            this.pendingRequests.set(pending.filter((req) => req.senderId !== data.blockerId));

            // Remove any sent requests to the blocker
            const sent = this.sentRequests();
            this.sentRequests.set(sent.filter((req) => req.receiverId !== data.blockerId));
        });

        const userUnblockedYouSub = this.socketService.listen<any>('user-unblocked-you').subscribe(() => {
            // No action needed - users can send new requests if they want
        });

        this.socketSubscriptions.push(
            requestReceivedSub,
            friendAddedSub,
            requestRejectedSub,
            friendRemovedSub,
            userBlockedYouSub,
            userUnblockedYouSub,
        );
    }

    sendRequest(request: FriendRequest, receiverData: { id: string; username: string; avatar: string }): void {
        const current = this.sentRequests();
        const exists = current.some((req) => req.id === request.id);

        if (!exists) {
            this.sentRequests.set([...current, { ...request, receiver: receiverData }]);
        }
    }

    acceptRequest(requestId: string, newFriend: User): void {
        const current = this.pendingRequests();
        this.pendingRequests.set(current.filter((req) => req.id !== requestId));

        const currentFriends = this.friends();
        const exists = currentFriends.some((f) => f.id === newFriend.id);
        if (!exists) {
            this.friends.set([...currentFriends, newFriend]);
        }
    }

    rejectRequest(requestId: string): void {
        const current = this.pendingRequests();
        this.pendingRequests.set(current.filter((req) => req.id !== requestId));
    }

    cancelRequest(requestId: string): void {
        const current = this.sentRequests();
        this.sentRequests.set(current.filter((req) => req.id !== requestId));
    }

    removeFriend(friendId: string): void {
        const current = this.friends();
        this.friends.set(current.filter((f) => f.id !== friendId));
    }

    blockUser(user: User): void {
        const currentBlocked = this.blockedUsers();
        const exists = currentBlocked.some((u) => u.id === user.id);
        if (!exists) {
            this.blockedUsers.set([...currentBlocked, user]);
        }

        // Remove from friends list
        const currentFriends = this.friends();
        this.friends.set(currentFriends.filter((f) => f.id !== user.id));

        // Remove from pending requests
        const pending = this.pendingRequests();
        this.pendingRequests.set(pending.filter((req) => req.senderId !== user.id));

        // Remove from sent requests
        const sent = this.sentRequests();
        this.sentRequests.set(sent.filter((req) => req.receiverId !== user.id));
    }

    unblockUser(userId: string): void {
        const current = this.blockedUsers();
        this.blockedUsers.set(current.filter((u) => u.id !== userId));
    }
}

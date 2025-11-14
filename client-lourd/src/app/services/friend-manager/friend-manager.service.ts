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

    private socketSubscriptions: Subscription[] = [];
    private isInitialized = false;

    constructor(
        private friendsService: FriendsService,
        private socketService: SocketClientService,
    ) {}

    /**
     * Initialize the service - call this once when user logs in
     */
    initialize(): void {
        if (this.isInitialized) return;

        this.loadAllData();
        this.setupSocketListeners();
        this.isInitialized = true;
    }

    /**
     * Clean up - call this when user logs out
     */
    cleanup(): void {
        this.socketSubscriptions.forEach((sub) => sub.unsubscribe());
        this.socketSubscriptions = [];
        this.friends.set([]);
        this.pendingRequests.set([]);
        this.sentRequests.set([]);
        this.isInitialized = false;
    }

    /**
     * Refresh all data from server
     */
    refresh(): void {
        this.loadAllData();
    }

    private loadAllData(): void {
        this.friendsService.getFriendsList().subscribe({
            next: (friends) => {
                console.log('👥 Friends loaded:', friends.length);
                this.friends.set(friends);
            },
            error: (error) => console.error('Error loading friends:', error),
        });

        this.friendsService.getPendingRequests().subscribe({
            next: (requests) => {
                console.log('📥 Pending requests loaded:', requests.length);
                this.pendingRequests.set(requests);
            },
            error: (error) => console.error('Error loading pending requests:', error),
        });

        this.friendsService.getSentRequests().subscribe({
            next: (requests) => {
                console.log('📤 Sent requests loaded:', requests.length);
                this.sentRequests.set(requests);
            },
            error: (error) => console.error('Error loading sent requests:', error),
        });
    }

    private setupSocketListeners(): void {
        console.log('🔌 Setting up friend socket listeners...');

        // Listen for incoming friend requests
        const requestReceivedSub = this.socketService.listen<any>('friend-request-received').subscribe((data) => {
            console.log('🔔 Friend request received via socket:', data);

            const current = this.pendingRequests();
            const exists = current.some((req) => req.id === data.id);

            if (!exists) {
                console.log('➕ Adding to pending requests');
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
            } else {
                console.log('⚠️ Request already exists in pending list');
            }
        });

        // Listen for accepted friend requests
        const friendAddedSub = this.socketService.listen<any>('friend-added').subscribe((data) => {
            console.log('✅ Friend added via socket:', data);

            // Remove from sent requests
            const currentSent = this.sentRequests();
            const filteredSent = currentSent.filter((req) => req.receiverId !== data.friend.id);
            if (filteredSent.length !== currentSent.length) {
                console.log('➖ Removing from sent requests');
                this.sentRequests.set(filteredSent);
            }

            // Add to friends list
            const currentFriends = this.friends();
            const exists = currentFriends.some((f) => f.id === data.friend.id);
            if (!exists) {
                console.log('➕ Adding to friends list');
                this.friends.set([...currentFriends, data.friend as User]);
            } else {
                console.log('⚠️ Friend already exists in list');
            }
        });

        // Listen for rejected friend requests
        const requestRejectedSub = this.socketService.listen<any>('friend-request-rejected').subscribe((data) => {
            console.log('❌ Friend request rejected via socket:', data);

            // Remove from sent requests
            const current = this.sentRequests();
            this.sentRequests.set(current.filter((req) => req.id !== data.requestId));
        });

        // Listen for removed friends
        const friendRemovedSub = this.socketService.listen<any>('friend-removed').subscribe((data) => {
            console.log('👋 Friend removed via socket:', data);

            // Remove from friends list
            const current = this.friends();
            this.friends.set(current.filter((f) => f.id !== data.friendId));
        });

        this.socketSubscriptions.push(requestReceivedSub, friendAddedSub, requestRejectedSub, friendRemovedSub);

        console.log('✅ Friend socket listeners set up successfully');
    }

    // Helper methods for actions
    sendRequest(request: FriendRequest, receiverData: { id: string; username: string; avatar: string }): void {
        const current = this.sentRequests();
        const exists = current.some((req) => req.id === request.id);

        if (!exists) {
            this.sentRequests.set([...current, { ...request, receiver: receiverData }]);
        }
    }

    acceptRequest(requestId: string, newFriend: User): void {
        // Remove from pending
        const current = this.pendingRequests();
        this.pendingRequests.set(current.filter((req) => req.id !== requestId));

        // Add to friends
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
}

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { FriendsService } from '@app/services/http-manager/http-friends.service';
import { FriendRequest } from '@common/friend-request';
import { User } from '@common/user';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-socials-popup',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './socials-popup.component.html',
    styleUrls: ['./socials-popup.component.scss'],
})
export class SocialsPopupComponent implements OnInit, OnDestroy {
    @Output() close = new EventEmitter<void>();

    activeTab: 'friends' | 'received' | 'sent' | 'add' = 'friends';
    friends: User[] = [];
    pendingRequests: (FriendRequest & { sender: { id: string; username: string; avatar: string } })[] = [];
    sentRequests: (FriendRequest & { receiver: { id: string; username: string; avatar: string } })[] = [];
    searchQuery = '';
    searchResults: User[] = [];
    isLoading = false;
    hasSearched = false;

    private socketSubscriptions: Subscription[] = [];

    constructor(
        private friendsService: FriendsService,
        private socketService: SocketClientService,
    ) {}

    ngOnInit() {
        this.loadFriends();
        this.loadPendingRequests();
        this.loadSentRequests();
        this.setupSocketListeners();
    }

    ngOnDestroy() {
        // Clean up socket subscriptions
        this.socketSubscriptions.forEach((sub) => sub.unsubscribe());
    }

    private setupSocketListeners() {
        // Listen for incoming friend requests
        const requestReceivedSub = this.socketService.listen<any>('friend-request-received').subscribe((data: any) => {
            console.log('🔔 Friend request received:', data);

            // Add to pending requests if not already there
            const exists = this.pendingRequests.some((req) => req.id === data.id);
            if (!exists) {
                this.pendingRequests.push({
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
                });
            }
        });

        // Listen for accepted friend requests
        const friendAddedSub = this.socketService.listen<any>('friend-added').subscribe((data: any) => {
            console.log('✅ Friend added:', data);

            // Remove from sent requests if it was there
            this.sentRequests = this.sentRequests.filter((req) => req.receiverId !== data.friend.id);

            // Add to friends list if not already there
            const exists = this.friends.some((f) => f.id === data.friend.id);
            if (!exists) {
                this.friends.push(data.friend as User);
            }
        });

        // Listen for rejected friend requests
        const requestRejectedSub = this.socketService.listen<any>('friend-request-rejected').subscribe((data: any) => {
            console.log('❌ Friend request rejected:', data);

            // Remove from sent requests
            this.sentRequests = this.sentRequests.filter((req) => req.id !== data.requestId);
        });

        // Listen for removed friends
        const friendRemovedSub = this.socketService.listen<any>('friend-removed').subscribe((data: any) => {
            console.log('👋 Friend removed:', data);

            // Remove from friends list
            this.friends = this.friends.filter((f) => f.id !== data.friendId);
        });

        this.socketSubscriptions.push(requestReceivedSub, friendAddedSub, requestRejectedSub, friendRemovedSub);
    }

    private loadFriends() {
        this.isLoading = true;
        this.friendsService.getFriendsList().subscribe({
            next: (friends: User[]) => {
                this.friends = friends;
                this.isLoading = false;
            },
            error: (error: any) => {
                console.error('Error loading friends:', error);
                this.isLoading = false;
            },
        });
    }

    private loadPendingRequests() {
        this.friendsService.getPendingRequests().subscribe({
            next: (requests: any[]) => {
                console.log('📥 Pending requests loaded:', requests);
                console.log('📥 Count:', requests.length);
                requests.forEach((req) => {
                    console.log(`  - Request ${req.id}: from ${req.senderId} (${req.sender?.username}) to ${req.receiverId}`);
                });
                this.pendingRequests = requests;
            },
            error: (error: any) => {
                console.error('Error loading pending requests:', error);
            },
        });
    }

    private loadSentRequests() {
        this.friendsService.getSentRequests().subscribe({
            next: (requests: any[]) => {
                console.log('📤 Sent requests loaded:', requests);
                console.log('📤 Count:', requests.length);
                requests.forEach((req) => {
                    console.log(`  - Request ${req.id}: from ${req.senderId} to ${req.receiverId} (${req.receiver?.username})`);
                });
                this.sentRequests = requests;
            },
            error: (error: any) => {
                console.error('Error loading sent requests:', error);
            },
        });
    }

    onClose() {
        this.close.emit();
    }

    searchUsers() {
        if (!this.searchQuery.trim()) {
            this.searchResults = [];
            this.hasSearched = false;
            return;
        }

        this.hasSearched = true;
        this.friendsService.searchUsers(this.searchQuery).subscribe({
            next: (users: User[]) => {
                this.searchResults = users;
            },
            error: (error: any) => {
                console.error('Error searching users:', error);
                this.searchResults = [];
            },
        });
    }

    sendFriendRequest(user: User) {
        this.friendsService.sendFriendRequest(user.id).subscribe({
            next: (request: any) => {
                console.log('✉️ Friend request sent:', request);

                // ✅ Optimistically add to sent requests (UI update)
                // The receiver will get it via socket event 'friend-request-received'
                const exists = this.sentRequests.some((req) => req.id === request.id);
                if (!exists) {
                    this.sentRequests.push({
                        ...request,
                        receiver: {
                            id: user.id,
                            username: user.username,
                            avatar: user.avatar,
                        },
                    });
                }

                // Remove from search results
                this.searchResults = this.searchResults.filter((u) => u.id !== user.id);
            },
            error: (error: { message: any }) => {
                console.error('Error sending friend request:', error);
                alert(error.message);
            },
        });
    }

    acceptRequest(request: FriendRequest & { sender: { id: string; username: string; avatar: string } }) {
        this.friendsService.acceptFriendRequest(request.id).subscribe({
            next: (result: { sender: any }) => {
                console.log('✅ Request accepted:', result);

                // Remove from pending requests
                this.pendingRequests = this.pendingRequests.filter((req) => req.id !== request.id);

                // Add the new friend to the list if not already there
                const exists = this.friends.some((f) => f.id === result.sender.id);
                if (!exists) {
                    this.friends.push(result.sender);
                }
            },
            error: (error: { message: any }) => {
                console.error('Error accepting request:', error);
                alert(error.message);
            },
        });
    }

    rejectRequest(request: FriendRequest) {
        this.friendsService.rejectFriendRequest(request.id).subscribe({
            next: () => {
                console.log('❌ Request rejected:', request.id);
                this.pendingRequests = this.pendingRequests.filter((req) => req.id !== request.id);
            },
            error: (error: { message: any }) => {
                console.error('Error rejecting request:', error);
                alert(error.message);
            },
        });
    }

    cancelRequest(request: FriendRequest) {
        this.friendsService.cancelFriendRequest(request.id).subscribe({
            next: () => {
                console.log('🚫 Request canceled:', request.id);
                this.sentRequests = this.sentRequests.filter((req) => req.id !== request.id);
            },
            error: (error: { message: any }) => {
                console.error('Error canceling request:', error);
                alert(error.message);
            },
        });
    }

    removeFriend(friend: User) {
        if (confirm(`Êtes-vous sûr de vouloir supprimer ${friend.username} de vos amis ?`)) {
            this.friendsService.removeFriend(friend.id).subscribe({
                next: () => {
                    console.log('👋 Friend removed:', friend.id);
                    this.friends = this.friends.filter((f) => f.id !== friend.id);
                },
                error: (error: { message: any }) => {
                    console.error('Error removing friend:', error);
                    alert(error.message);
                },
            });
        }
    }

    onSearchChange() {
        if (!this.searchQuery.trim()) {
            this.searchResults = [];
            this.hasSearched = false;
        }
    }
}

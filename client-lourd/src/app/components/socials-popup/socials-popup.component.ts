import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FriendManagerService } from '@app/services/friend-manager/friend-manager.service';
import { FriendsService } from '@app/services/http-manager/http-friends.service';
import { FriendRequest } from '@common/friend-request';
import { User } from '@common/user';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-socials-popup',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslatePipe],
    templateUrl: './socials-popup.component.html',
    styleUrls: ['./socials-popup.component.scss'],
})
export class SocialsPopupComponent implements OnInit {
    @Output() close = new EventEmitter<void>();

    activeTab: 'friends' | 'received' | 'sent' | 'add' = 'friends';

    get friends() {
        return this.friendManagerService.friends();
    }
    get pendingRequests() {
        return this.friendManagerService.pendingRequests();
    }
    get sentRequests() {
        return this.friendManagerService.sentRequests();
    }

    friendCount = computed(() => this.friendManagerService.friends().length);
    pendingCount = computed(() => this.friendManagerService.pendingRequests().length);
    sentCount = computed(() => this.friendManagerService.sentRequests().length);

    searchQuery = '';
    searchResults: User[] = [];
    isLoading = false;
    hasSearched = false;

    showConfirmation = false;
    confirmationMessage = '';
    pendingAction: (() => void) | null = null;

    showError = false;
    errorMessage = '';

    constructor(
        private friendsHttpService: FriendsService,
        private friendManagerService: FriendManagerService,
    ) {}

    ngOnInit() {
        this.friendManagerService.refresh();
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
        this.isLoading = true;

        this.friendsHttpService.searchUsers(this.searchQuery).subscribe({
            next: (users: User[]) => {
                this.searchResults = users;
                this.isLoading = false;
            },
            error: () => {
                this.showErrorMessage('socials-popup.errors.search-failed');
                this.searchResults = [];
                this.isLoading = false;
            },
        });
    }

    sendFriendRequest(user: User) {
        this.friendsHttpService.sendFriendRequest(user.id).subscribe({
            next: (request: any) => {
                this.friendManagerService.sendRequest(request, {
                    id: user.id,
                    username: user.username,
                    avatar: user.avatar,
                });
                this.searchResults = this.searchResults.filter((u) => u.id !== user.id);
            },
            error: () => this.showErrorMessage('socials-popup.errors.send-request-failed'),
        });
    }

    acceptRequest(request: FriendRequest & { sender: { id: string; username: string; avatar: string } }) {
        this.friendsHttpService.acceptFriendRequest(request.id).subscribe({
            next: (result: { sender: User }) => {
                this.friendManagerService.acceptRequest(request.id, result.sender);
            },
            error: () => this.showErrorMessage('socials-popup.errors.accept-failed'),
        });
    }

    rejectRequest(request: FriendRequest) {
        this.friendsHttpService.rejectFriendRequest(request.id).subscribe({
            next: () => this.friendManagerService.rejectRequest(request.id),
            error: () => this.showErrorMessage('socials-popup.errors.reject-failed'),
        });
    }

    cancelRequest(request: FriendRequest) {
        this.friendsHttpService.cancelFriendRequest(request.id).subscribe({
            next: () => this.friendManagerService.cancelRequest(request.id),
            error: () => this.showErrorMessage('socials-popup.errors.cancel-failed'),
        });
    }

    confirmRemoveFriend(friend: User) {
        this.confirmationMessage = 'socials-popup.confirm-remove-friend';
        this.pendingAction = () => this.executeRemoveFriend(friend);
        this.showConfirmation = true;
    }

    private executeRemoveFriend(friend: User) {
        this.friendsHttpService.removeFriend(friend.id).subscribe({
            next: () => this.friendManagerService.removeFriend(friend.id),
            error: () => this.showErrorMessage('socials-popup.errors.remove-failed'),
        });
    }

    confirmBlockUser(user: User) {
        this.confirmationMessage = 'socials-popup.confirm-block-user';
        this.pendingAction = () => this.executeBlockUser(user);
        this.showConfirmation = true;
    }

    private executeBlockUser(user: User) {
        this.friendsHttpService.blockUser(user.id).subscribe({
            next: () => {
                this.friendManagerService.blockUser(user);
                this.searchResults = this.searchResults.filter((u) => u.id !== user.id);
            },
            error: () => this.showErrorMessage('socials-popup.errors.block-failed'),
        });
    }

    confirmAction() {
        if (this.pendingAction) {
            this.pendingAction();
        }
        this.closeConfirmation();
    }

    closeConfirmation() {
        this.showConfirmation = false;
        this.confirmationMessage = '';
        this.pendingAction = null;
    }

    private showErrorMessage(message: string) {
        this.errorMessage = message;
        this.showError = true;
        setTimeout(() => (this.showError = false), 3000);
    }

    closeError() {
        this.showError = false;
    }

    onSearchChange() {
        if (!this.searchQuery.trim()) {
            this.searchResults = [];
            this.hasSearched = false;
        }
    }
}

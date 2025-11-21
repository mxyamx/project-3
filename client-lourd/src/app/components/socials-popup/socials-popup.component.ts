import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, inject, OnDestroy, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FriendManagerService } from '@app/services/friend-manager/friend-manager.service';
import { GameInvitation, GameInviteService } from '@app/services/game-invite/game-invite.service';
import { FriendsService } from '@app/services/http-manager/http-friends.service';
import { UserStatusService } from '@app/services/user-status/user-status.service';
import { DeviceType } from '@common/enums/deviceType';
import { GameActivityStatus } from '@common/enums/game-activity-status';
import { FriendRequest } from '@common/friend-request';
import { User, UserStatusInfo } from '@common/user';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-socials-popup',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslatePipe],
    templateUrl: './socials-popup.component.html',
    styleUrls: ['./socials-popup.component.scss'],
})
export class SocialsPopupComponent implements OnInit, OnDestroy {
    @Output() close = new EventEmitter<void>();

    private userStatusService = inject(UserStatusService);
    private gameInviteService = inject(GameInviteService);
    private statusSubscription?: Subscription;
    private inviteSubscription?: Subscription;

    activeTab: 'friends' | 'received' | 'sent' | 'add' | 'invites' = 'friends';

    friendStatuses = new Map<string, UserStatusInfo>();
    DeviceType = DeviceType;
    GameActivityStatus = GameActivityStatus;

    gameInvites = signal<GameInvitation[]>([]);
    isProcessingInvite = false;

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
    invitesCount = computed(() => this.gameInvites().length);

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

        const friendIds = this.friends.map((f) => f.id);
        if (friendIds.length > 0) {
            this.userStatusService.fetchUserStatuses(friendIds);
        }

        this.statusSubscription = this.userStatusService.getAllStatuses().subscribe((statuses) => {
            this.friendStatuses = new Map(statuses);
        });

        this.inviteSubscription = this.gameInviteService.getPendingInvitations().subscribe((invites) => {
            this.gameInvites.set(invites);
        });

        this.gameInviteService.getProcessingState().subscribe((processing) => {
            this.isProcessingInvite = processing;
        });
    }

    ngOnDestroy(): void {
        this.statusSubscription?.unsubscribe();
        this.inviteSubscription?.unsubscribe();
    }

    // ========== STATUS ==========

    getFriendStatus(friendId: string): UserStatusInfo | undefined {
        return this.friendStatuses.get(friendId);
    }

    getDeviceIcon(deviceType: DeviceType): string {
        switch (deviceType) {
            case DeviceType.web:
                return 'fa-desktop';
            case DeviceType.mobile:
                return 'fa-tablet-alt';
            case DeviceType.offline:
                return 'fa-circle';
            default:
                return 'fa-circle';
        }
    }

    getActivityIcon(activity?: GameActivityStatus): string {
        if (!activity || activity === GameActivityStatus.idle) return '';
        return 'fa-gamepad';
    }

    getStatusColor(deviceType: DeviceType, activity?: GameActivityStatus): string {
        if (deviceType === DeviceType.offline) return '#9e9e9e';
        if (activity === GameActivityStatus.inGame) return '#2196f3';
        return '#4caf50';
    }

    onClose() {
        this.close.emit();
    }

    // ========== GAME INVITES ==========

    acceptGameInvite(invite: GameInvitation) {
        this.gameInviteService.acceptInvitation(invite);
    }

    declineGameInvite(invite: GameInvitation) {
        this.gameInviteService.declineInvitation(invite);
    }

    getTimeAgo(timestamp: number): string {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }

    // ========== FRIEND SYSTEM ==========

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
                this.userStatusService.fetchUserStatuses([result.sender.id]);
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

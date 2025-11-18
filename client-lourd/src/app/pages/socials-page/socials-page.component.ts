import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit } from '@angular/core';
import { FriendManagerService } from '@app/services/friend-manager/friend-manager.service';
import { FriendsService } from '@app/services/http-manager/http-friends.service';
import { UserStatusService } from '@app/services/user-status/user-status.service';
import { DeviceType } from '@common/enums/deviceType';
import { GameActivityStatus } from '@common/enums/game-activity-status';
import { User, UserStatusInfo } from '@common/user';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-socials-page',
    standalone: true,
    imports: [CommonModule, TranslatePipe],
    templateUrl: './socials-page.component.html',
    styleUrls: ['./socials-page.component.scss'],
})
export class SocialsPageComponent implements OnInit, OnDestroy {
    private userStatusService = inject(UserStatusService);
    private statusSubscription?: Subscription;

    // Expose signals directly
    friends = this.friendManagerService.friends;
    blockedUsers = this.friendManagerService.blockedUsers;

    friendCount = computed(() => this.friendManagerService.friends().length);
    blockedCount = computed(() => this.friendManagerService.blockedUsers().length);

    friendStatuses = new Map<string, UserStatusInfo>();
    DeviceType = DeviceType;
    GameActivityStatus = GameActivityStatus;

    showConfirmation = false;
    confirmationMessage = '';
    pendingAction: (() => void) | null = null;

    showError = false;
    errorMessage = '';

    constructor(
        private friendsService: FriendsService,
        private friendManagerService: FriendManagerService,
    ) {}

    ngOnInit(): void {
        this.friendManagerService.refresh();

        // Fetch initial statuses for all friends
        const friendIds = this.friends().map((f) => f.id);
        if (friendIds.length > 0) {
            this.userStatusService.fetchUserStatuses(friendIds);
        }

        // Subscribe to real-time status updates
        this.statusSubscription = this.userStatusService.getAllStatuses().subscribe((statuses) => {
            this.friendStatuses = new Map(statuses);
        });
    }

    ngOnDestroy(): void {
        this.statusSubscription?.unsubscribe();
    }

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

    confirmRemoveFriend(friend: User): void {
        this.confirmationMessage = 'socials-page.confirm-remove-friend';
        this.pendingAction = () => this.executeRemoveFriend(friend);
        this.showConfirmation = true;
    }

    private executeRemoveFriend(friend: User): void {
        this.friendsService.removeFriend(friend.id).subscribe({
            next: () => {
                this.friendManagerService.removeFriend(friend.id);
            },
            error: () => this.showErrorMessage('socials-page.errors.remove-failed'),
        });
    }

    confirmBlockUser(friend: User): void {
        this.confirmationMessage = 'socials-page.confirm-block-user';
        this.pendingAction = () => this.executeBlockUser(friend);
        this.showConfirmation = true;
    }

    private executeBlockUser(friend: User): void {
        this.friendsService.blockUser(friend.id).subscribe({
            next: () => {
                this.friendManagerService.blockUser(friend);
            },
            error: () => this.showErrorMessage('socials-page.errors.block-failed'),
        });
    }

    confirmUnblockUser(user: User): void {
        this.confirmationMessage = 'socials-page.confirm-unblock-user';
        this.pendingAction = () => this.executeUnblockUser(user);
        this.showConfirmation = true;
    }

    private executeUnblockUser(user: User): void {
        this.friendsService.unblockUser(user.id).subscribe({
            next: () => {
                this.friendManagerService.unblockUser(user.id);
            },
            error: () => this.showErrorMessage('socials-page.errors.unblock-failed'),
        });
    }

    confirmAction(): void {
        if (this.pendingAction) {
            this.pendingAction();
        }
        this.closeConfirmation();
    }

    closeConfirmation(): void {
        this.showConfirmation = false;
        this.confirmationMessage = '';
        this.pendingAction = null;
    }

    private showErrorMessage(message: string): void {
        this.errorMessage = message;
        this.showError = true;
        setTimeout(() => (this.showError = false), 3000);
    }

    closeError(): void {
        this.showError = false;
    }
}

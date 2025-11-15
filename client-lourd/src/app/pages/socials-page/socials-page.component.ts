import { CommonModule } from '@angular/common';
import { Component, computed, OnInit } from '@angular/core';
import { FriendManagerService } from '@app/services/friend-manager/friend-manager.service';
import { FriendsService } from '@app/services/http-manager/http-friends.service';
import { User } from '@common/user';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-socials-page',
    standalone: true,
    imports: [CommonModule, TranslatePipe],
    templateUrl: './socials-page.component.html',
    styleUrls: ['./socials-page.component.scss'],
})
export class SocialsPageComponent implements OnInit {
    // Expose signals directly
    friends = this.friendManagerService.friends;
    blockedUsers = this.friendManagerService.blockedUsers;

    friendCount = computed(() => this.friendManagerService.friends().length);
    blockedCount = computed(() => this.friendManagerService.blockedUsers().length);

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

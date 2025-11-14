import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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
    get friends() {
        return this.friendManagerService.friends();
    }

    blockedUsers: User[] = [];

    // Confirmation and error states
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
        this.loadBlockedUsers();
    }

    loadBlockedUsers(): void {
        // TODO: Replace with backend call when implemented
        this.blockedUsers = [];
    }

    // Confirmation for removing friend
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
            error: (err: { message: string }) => this.showErrorMessage('socials-page.errors.remove-failed'),
        });
    }

    // Confirmation for blocking user
    confirmBlockUser(friend: User): void {
        this.confirmationMessage = 'socials-page.confirm-block-user';
        this.pendingAction = () => this.executeBlockUser(friend);
        this.showConfirmation = true;
    }

    private executeBlockUser(friend: User): void {
        // TODO: Replace with backend call when implemented
        this.blockedUsers.push(friend);
        this.friendManagerService.removeFriend(friend.id);
        this.showErrorMessage('socials-page.block-not-implemented');
    }

    // Confirmation for unblocking user
    confirmUnblockUser(user: User): void {
        this.confirmationMessage = 'socials-page.confirm-unblock-user';
        this.pendingAction = () => this.executeUnblockUser(user);
        this.showConfirmation = true;
    }

    private executeUnblockUser(user: User): void {
        // TODO: Replace with backend call when implemented
        this.blockedUsers = this.blockedUsers.filter((u) => u.id !== user.id);
        this.showErrorMessage('socials-page.unblock-not-implemented');
    }

    // Confirm action
    confirmAction(): void {
        if (this.pendingAction) {
            this.pendingAction();
        }
        this.closeConfirmation();
    }

    // Cancel confirmation
    closeConfirmation(): void {
        this.showConfirmation = false;
        this.confirmationMessage = '';
        this.pendingAction = null;
    }

    // Show error message
    private showErrorMessage(message: string): void {
        this.errorMessage = message;
        this.showError = true;

        // Auto-hide after 3 seconds
        setTimeout(() => {
            this.showError = false;
        }, 3000);
    }

    // Close error message manually
    closeError(): void {
        this.showError = false;
    }
}

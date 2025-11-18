import { Component, computed, inject, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ChatContainerComponent } from '@app/components/chat-container/chat-container.component';
import { GameInviteInboxComponent } from '@app/components/game-invite-inbox/game-invite-inbox.component'; // Add this import
import { SocialsPopupComponent } from '@app/components/socials-popup/socials-popup.component';
import { AuthentificationService } from '@app/services/authentification/authentification.service';
import { ChatDockService } from '@app/services/chat-dock/chat-dock.service';
import { FriendManagerService } from '@app/services/friend-manager/friend-manager.service';
import { GameInviteService } from '@app/services/game-invite/game-invite.service'; // Add this import
import { HttpUserService } from '@app/services/http-manager/http-users.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { UserManagerService } from '@app/services/user-manager/user-manager.service';
import { DeviceType } from '@common/enums/deviceType';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-main-page',
    templateUrl: './main-page.component.html',
    styleUrls: ['./main-page.component.scss'],
    imports: [RouterLink, ChatContainerComponent, TranslatePipe, SocialsPopupComponent, GameInviteInboxComponent], // Add GameInviteInboxComponent
})
export class MainPageComponent implements OnDestroy, OnInit {
    chatDockService: ChatDockService = inject(ChatDockService);
    private authService: AuthentificationService = inject(AuthentificationService);
    private userManager: UserManagerService = inject(UserManagerService);
    private httpUserService: HttpUserService = inject(HttpUserService);
    private playerSocketService = inject(PlayerSocketService);
    private friendService = inject(FriendManagerService);
    private gameInviteService = inject(GameInviteService); // Add this

    constructor(private router: Router) {}

    readonly title: string = 'Méchante Patte';
    avatar = this.userManager.currentUser.asReadonly();
    showChat: WritableSignal<boolean> = signal(false);
    showSocialsPopup: WritableSignal<boolean> = signal(false);
    showInviteInbox: WritableSignal<boolean> = signal(false); // Add this

    // Computed signal for pending request count (notification badge)
    pendingRequestCount = computed(() => this.friendService.pendingRequests().length);

    // Computed signal for pending invitation count
    pendingInvitationCount = computed(() => this.gameInviteService.getInvitationCount());

    // Signal for new invitation notifications
    hasNewInvitations = signal(false);
    private invitationSubscription?: Subscription;
    private newInvitationSubscription?: Subscription;

    ngOnInit() {
        if (!this.playerSocketService.isConnected()) {
            this.playerSocketService.connect();
        }
        this.refreshUserData();
        this.setupInvitationListeners();
    }

    ngOnDestroy(): void {
        this.chatDockService.leftGame();
        this.invitationSubscription?.unsubscribe();
        this.newInvitationSubscription?.unsubscribe();
    }

    private setupInvitationListeners(): void {
        // Subscribe to new invitation notifications
        this.newInvitationSubscription = this.gameInviteService.hasNew().subscribe((hasNew) => {
            this.hasNewInvitations.set(hasNew);

            // Optional: Show a toast notification when new invitation arrives
            if (hasNew && !this.showInviteInbox()) {
                this.showNewInvitationToast();
            }
        });
    }

    private showNewInvitationToast(): void {
        // You can implement a toast notification here
        // For now, we'll just log to console
        console.log('🎮 New game invitation received!');

        // Optional: You could add a temporary notification badge or animation
        setTimeout(() => {
            // Flash effect for the invitation icon
            const inviteIcon = document.querySelector('.invite-notification-wrapper');
            if (inviteIcon) {
                inviteIcon.classList.add('new-invitation-pulse');
                setTimeout(() => {
                    inviteIcon.classList.remove('new-invitation-pulse');
                }, 2000);
            }
        }, 100);
    }

    logout() {
        const user = this.userManager.getCurrentUser();
        user.status = DeviceType.offline;
        this.playerSocketService.disconnect();
        this.friendService.cleanup();
        this.gameInviteService.clearAllInvitations(); // Clear invitations on logout

        this.httpUserService.updateUser(user).subscribe({
            next: () => {
                this.authService.logout();
                this.userManager.resetUser();
                this.router.navigate(['/login']);
            },
            error: (err) => {
                console.error('Error updating user status on logout:', err);
                this.authService.logout();
                this.userManager.resetUser();
                this.router.navigate(['/login']);
            },
        });
    }

    openShop() {
        this.router.navigate(['/shop']);
    }

    openProfile() {
        this.router.navigate(['/profile']);
    }

    openGeneralChat() {
        this.showChat.set(!this.showChat());
    }

    openSettings(): void {
        this.router.navigate(['/settings']);
    }

    private refreshUserData(): void {
        const userId = this.userManager.getCurrentUser().id;
        if (!userId) return;

        this.httpUserService.getUser(userId).subscribe({
            next: (user) => {
                // Update all user fields from DB
                this.userManager.currentUser.set(user);
            },
            error: (err) => console.error('Failed to refresh user data:', err),
        });
    }

    openSocialsPopup() {
        this.showSocialsPopup.set(true);
    }

    closeSocialsPopup() {
        this.showSocialsPopup.set(false);
    }

    // Add these methods for the invite inbox
    openInviteInbox() {
        this.showInviteInbox.set(true);
        this.hasNewInvitations.set(false); // Mark as read when opening
    }

    closeInviteInbox() {
        this.showInviteInbox.set(false);
    }
}

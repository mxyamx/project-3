import { Component, computed, inject, OnInit, OnDestroy, signal, WritableSignal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ChatContainerComponent } from '@app/components/chat-container/chat-container.component';
import { SocialsPopupComponent } from '@app/components/socials-popup/socials-popup.component';
import { AuthentificationService } from '@app/services/authentification/authentification.service';
import { ChatService } from '@app/services/chat/chat.service';
import { FriendManagerService } from '@app/services/friend-manager/friend-manager.service';
import { GameInviteService } from '@app/services/game-invite/game-invite.service';
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
    imports: [RouterLink, ChatContainerComponent, TranslatePipe, SocialsPopupComponent],
})
export class MainPageComponent implements OnInit, OnDestroy {
    chatService = inject(ChatService);
    private authService: AuthentificationService = inject(AuthentificationService);
    private userManager: UserManagerService = inject(UserManagerService);
    private httpUserService: HttpUserService = inject(HttpUserService);
    private playerSocketService = inject(PlayerSocketService);
    private friendService = inject(FriendManagerService);
    private gameInviteService = inject(GameInviteService);

    private inviteCountSubscription?: Subscription;
    private isListeningForNotifications = false;

    constructor(private router: Router) {}

    readonly title: string = 'Méchante Patte';
    avatar = this.userManager.currentUser.asReadonly();
    showChat: WritableSignal<boolean> = signal(false);
    showSocialsPopup: WritableSignal<boolean> = signal(false);

    gameInviteCount = signal(0);

    totalNotificationCount = computed(() => this.friendService.pendingRequests().length + this.gameInviteCount());

    ngOnInit() {
        if (!this.playerSocketService.isConnected()) {
            this.playerSocketService.connect();
        }
        this.refreshUserData();

        this.inviteCountSubscription = this.gameInviteService.getInvitationCountObservable().subscribe((count) => {
            this.gameInviteCount.set(count);
        });

        this.setupChatNotifications();
    }

    ngOnDestroy(): void {
        this.inviteCountSubscription?.unsubscribe();
        this.playerSocketService.unsubscribeChatNotification();
    }

    private setupChatNotifications(): void {
        if (this.isListeningForNotifications) return;
        this.isListeningForNotifications = true;

        const currentUserId = this.userManager.getCurrentUser().id;
        console.log('=== SETUP CHAT NOTIFICATIONS ===');
        console.log('Current user ID:', currentUserId);
        console.log('Socket connected:', this.playerSocketService.isConnected());

        this.playerSocketService.onChatNotification((data) => {
            console.log('=== RECEIVED CHAT NOTIFICATION ===');
            console.log('Data:', data);
            console.log('Room ID:', data.roomId);
            console.log('Message sender ID:', data.message.senderId);
            console.log('Message text:', data.message.text);
            console.log('Target user ID:', data.targetUserId);
            console.log('Current user ID:', currentUserId);
            console.log('Is chat open:', this.showChat());

            // Ignorer nos propres messages
            if (data.message.senderId === currentUserId) {
                console.log('>>> IGNORED: Own message');
                return;
            }

            // Ignorer si destiné à un autre utilisateur
            if (data.targetUserId && data.targetUserId !== currentUserId) {
                console.log('>>> IGNORED: Message for other user');
                return;
            }

            // Notifier seulement si le chat est fermé
            if (!this.showChat()) {
                console.log('>>> SHOWING NOTIFICATION!');
                this.chatService.incrementUnread();
                this.chatService.playNotificationSound();
            } else {
                console.log('>>> IGNORED: Chat is open');
            }
        });

        console.log('Chat notification listener registered');
    }

    logout() {
        const user = this.userManager.getCurrentUser();
        user.status = DeviceType.offline;
        this.playerSocketService.unsubscribeChatNotification();
        this.playerSocketService.disconnect();
        this.friendService.cleanup();
        this.chatService.closePopup();
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
        if (this.showChat()) {
            this.chatService.resetUnread();
        }
    }

    openSettings(): void {
        this.router.navigate(['/settings']);
    }

    private refreshUserData(): void {
        const userId = this.userManager.getCurrentUser().id;
        if (!userId) return;

        this.httpUserService.getUser(userId).subscribe({
            next: (user) => {
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
}
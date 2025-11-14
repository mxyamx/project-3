import { Component, computed, inject, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ChatContainerComponent } from '@app/components/chat-container/chat-container.component';
import { SocialsPopupComponent } from '@app/components/socials-popup/socials-popup.component';
import { AuthentificationService } from '@app/services/authentification/authentification.service';
import { ChatDockService } from '@app/services/chat-dock/chat-dock.service';
import { FriendManagerService } from '@app/services/friend-manager/friend-manager.service';
import { HttpUserService } from '@app/services/http-manager/http-users.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { UserManagerService } from '@app/services/user-manager/user-manager.service';
import { DeviceType } from '@common/enums/deviceType';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-main-page',
    templateUrl: './main-page.component.html',
    styleUrls: ['./main-page.component.scss'],
    imports: [RouterLink, ChatContainerComponent, TranslatePipe, SocialsPopupComponent],
})
export class MainPageComponent implements OnDestroy, OnInit {
    chatDockService: ChatDockService = inject(ChatDockService);
    private authService: AuthentificationService = inject(AuthentificationService);
    private userManager: UserManagerService = inject(UserManagerService);
    private httpUserService: HttpUserService = inject(HttpUserService);
    private playerSocketService = inject(PlayerSocketService);
    private friendService = inject(FriendManagerService);

    constructor(private router: Router) {}

    readonly title: string = 'Méchante Patte';
    avatar = this.userManager.currentUser.asReadonly();
    showChat: WritableSignal<boolean> = signal(false);
    showSocialsPopup: WritableSignal<boolean> = signal(false);

    // Computed signal for pending request count (notification badge)
    pendingRequestCount = computed(() => this.friendService.pendingRequests().length);

    ngOnInit() {
        if (!this.playerSocketService.isConnected()) {
            this.playerSocketService.connect();
        }
    }

    ngOnDestroy(): void {
        this.chatDockService.leftGame();
    }

    logout() {
        const user = this.userManager.getCurrentUser();
        user.status = DeviceType.offline;
        this.playerSocketService.disconnect();
        this.friendService.cleanup();

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

    openSocialsPopup() {
        this.showSocialsPopup.set(true);
    }

    closeSocialsPopup() {
        this.showSocialsPopup.set(false);
    }
}

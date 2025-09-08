import { Component, inject, OnDestroy, signal, WritableSignal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ChatComponent } from '@app/components/chat/chat.component';
import { AuthentificationService } from '@app/services/authentification/authentification.service';
import { ChatDockService } from '@app/services/chat-dock/chat-dock.service';
import { HttpUserService } from '@app/services/http-manager/http-users.service';
import { UserManagerService } from '@app/services/user-manager/user-manager.service';
import { ROOM_GENERAL } from '@common/constants/chat.constants';
import { DeviceType } from '@common/enums/deviceType';
@Component({
    selector: 'app-main-page',
    templateUrl: './main-page.component.html',
    styleUrls: ['./main-page.component.scss'],
    imports: [RouterLink, ChatComponent],
})
export class MainPageComponent implements OnDestroy {
    chatDockService: ChatDockService = inject(ChatDockService);
    private authService: AuthentificationService = inject(AuthentificationService);
    private userManager: UserManagerService = inject(UserManagerService);
    private httpUserService: HttpUserService = inject(HttpUserService);
    constructor(private router: Router) {}

    readonly title: string = 'Méchante Patte';
    readonly roomId: string = ROOM_GENERAL;
    avatar = this.userManager.currentUser.asReadonly();
    showChat: WritableSignal<boolean> = signal(false);

    ngOnDestroy(): void {
        this.chatDockService.leftGame();
    }
    logout() {
        const user = this.userManager.getCurrentUser();
        user.status = DeviceType.offline;

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

    openProfile() {
        this.router.navigate(['/profile']);
    }

    openGeneralChat() {
        this.showChat.set(!this.showChat());
    }
}

import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthentificationService } from '@app/services/authentification/authentification.service';
import { HttpUserService } from '@app/services/http-manager/http-users.service';
import { UserManagerService } from '@app/services/user-manager/user-manager.service';
import { DeviceType } from '@common/enums/deviceType';
import { ActiveTab } from '@common/enums/profile-tabs';

@Component({
    selector: 'app-profile-page',
    imports: [CommonModule],
    templateUrl: './profile-page.component.html',
    styleUrl: './profile-page.component.scss',
})
export class ProfilePageComponent {
    private userManager: UserManagerService = inject(UserManagerService);
    private authService: AuthentificationService = inject(AuthentificationService);
    private httpUserService: HttpUserService = inject(HttpUserService);
    DeviceType = DeviceType;
    ActiveTab = ActiveTab;

    constructor(private router: Router) {}

    user = this.userManager.currentUser();
    activeTab = ActiveTab.Socials;

    deleteAccountWarning = false;

    goHome() {
        this.router.navigate(['/home']);
    }

    editAccount() {
        console.log('Edit account clicked');
    }

    showDeletePopup() {
        this.deleteAccountWarning = true;
    }

    hideDeletePopup() {
        this.deleteAccountWarning = false;
    }

    confirmDelete() {
        this.deleteAccount();
        this.deleteAccountWarning = false;
    }

    deleteAccount() {
        const userId = this.authService.getCurrentUserId();
        if (userId) {
            this.authService.deleteAccount();
            this.httpUserService.deleteUser(userId).subscribe();
        }
        this.router.navigate(['/']);
    }


}

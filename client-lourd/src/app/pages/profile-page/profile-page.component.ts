import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UserManagerService } from '@app/services/user-manager/user-manager.service';
import { DeviceType } from '@common/enums/deviceType';

@Component({
    selector: 'app-profile-page',
    imports: [CommonModule],
    templateUrl: './profile-page.component.html',
    styleUrl: './profile-page.component.scss',
})
export class ProfilePageComponent {
    private userManager: UserManagerService = inject(UserManagerService);
    DeviceType = DeviceType;

    constructor(private router: Router) {}

    user = this.userManager.currentUser();
    activeTab: 'socials' | 'inventory' | 'statistics' = 'socials';

    goHome() {
        this.router.navigate(['/home']);
    }

    editAccount() {
        console.log('Edit account clicked');
    }

    deleteAccount() {
        console.log('Delete account clicked');
    }
}

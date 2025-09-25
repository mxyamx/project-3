import { Component, HostListener, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthentificationService } from '@app/services/authentification/authentification.service';
import { UserManagerService } from '@app/services/user-manager/user-manager.service';
import { DeviceType } from '@common/enums/deviceType';
import { environment } from 'src/environments/environment';

@Component({
    selector: 'app-root',
    standalone: true,
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    imports: [RouterOutlet],
})
export class AppComponent {
    private authService: AuthentificationService = inject(AuthentificationService);
    private userManager: UserManagerService = inject(UserManagerService);

    @HostListener('window:unload')
    onUnload() {
        const user = this.userManager.getCurrentUser();
        if (!user) return;

        user.status = DeviceType.offline;
        this.authService.logout();

        fetch(`${environment.serverUrl}/users/${user.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user),
            keepalive: true,
        });
    }
}

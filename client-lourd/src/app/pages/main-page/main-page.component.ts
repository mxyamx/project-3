import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthentificationService } from '@app/services/authentification/authentification.service';

@Component({
    selector: 'app-main-page',
    templateUrl: './main-page.component.html',
    styleUrls: ['./main-page.component.scss'],
    imports: [RouterLink],
})
export class MainPageComponent {
    private authService: AuthentificationService = inject(AuthentificationService);
    constructor(private router: Router) {}

    readonly title: string = 'Méchante Patte';

    logout() {
        this.authService.logout();
        this.router.navigate(['/login']);
    }
}

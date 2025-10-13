import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DropdownComponent } from '@app/components/dropdown/dropdown.component';
import { HttpUserService } from '@app/services/http-manager/http-users.service';
import { LanguageService } from '@app/services/language/language.service';
import { UserManagerService } from '@app/services/user-manager/user-manager.service';
import { InterfaceTheme } from '@common/enums/interfaceTheme';
import { Language } from '@common/enums/language';
import { Parameters } from '@common/parameters';
import { User } from '@common/user';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-settings-page',
    standalone: true,
    imports: [DropdownComponent, TranslatePipe],
    templateUrl: './settings-page.component.html',
    styleUrl: './settings-page.component.scss',
})
export class SettingsPageComponent implements OnInit {
    private languageService = inject(LanguageService);
    private httpUserService: HttpUserService = inject(HttpUserService);
    readonly languages = [Language.french, Language.english];
    readonly themes = [InterfaceTheme.Light, InterfaceTheme.Dark];
    selectedLanguage: Language;
    selectedTheme: InterfaceTheme;

    initialLanguage: Language;
    initialTheme: InterfaceTheme;

    constructor(
        private router: Router,
        private userManager: UserManagerService,
    ) {}

    ngOnInit(): void {
        const user = this.userManager.currentUser();
        const lang = user.parameters.language;
        const theme = user.parameters.theme;

        this.selectedLanguage = lang;
        this.initialLanguage = lang;
        this.selectedTheme = theme;
        this.initialTheme = theme;
        this.languageService.setTranslate(lang);
    }
    goHome() {
        this.router.navigate(['/home']);
    }
    applyChanges(): void {
        if (this.initialLanguage !== this.selectedLanguage || this.initialTheme !== this.selectedTheme) {
            const user = this.userManager.currentUser();
            const parameters: Parameters = { language: this.selectedLanguage, theme: this.selectedTheme };
            const updatedUser: User = { ...user, parameters };
            this.httpUserService.updateUser(updatedUser).subscribe({
                next: () => {
                    this.initialLanguage = updatedUser.parameters.language;
                    this.initialTheme = updatedUser.parameters.theme;
                    this.userManager.currentUser.set(updatedUser);
                    this.languageService.setTranslate(updatedUser.parameters.language);
                },
                error: (err) => {
                    //TODO: HANDLE ERROR
                },
            });
        }
    }
}

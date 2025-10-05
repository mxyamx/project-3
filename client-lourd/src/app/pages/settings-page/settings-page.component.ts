import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DropdownComponent } from '@app/components/dropdown/dropdown.component';
import { LANGUAGES, THEMES } from '@app/constants/settings-constant';
import { DropdownOption } from '@app/interfaces/dropdown-option';
import { UserManagerService } from '@app/services/user-manager/user-manager.service';
import { optionFromValue } from '@app/utils/functions/option-from-value';
import { InterfaceTheme } from '@common/enums/interfaceTheme';
import { Language } from '@common/enums/language';

@Component({
    selector: 'app-settings-page',
    standalone: true,
    imports: [DropdownComponent],
    templateUrl: './settings-page.component.html',
    styleUrl: './settings-page.component.scss',
})
export class SettingsPageComponent implements OnInit {
    readonly languages = LANGUAGES;
    readonly themes = THEMES;
    selectedLanguage: DropdownOption<Language>;
    selectedTheme: DropdownOption<InterfaceTheme>;

    initialLanguage: DropdownOption<Language>;
    initialTheme: DropdownOption<InterfaceTheme>;

    constructor(
        private router: Router,
        private userService: UserManagerService,
    ) {}

    ngOnInit(): void {
        const user = this.userService.currentUser();
        const langValue = user?.parameters?.language ?? Language.french;
        const themeValue = user?.parameters?.theme ?? InterfaceTheme.Light;

        const lang = optionFromValue(this.languages, langValue, this.languages[0]);
        const theme = optionFromValue(this.themes, themeValue, this.themes[0]);

        this.selectedLanguage = lang;
        this.initialLanguage = lang;
        this.selectedTheme = theme;
        this.initialTheme = theme;
    }
    goHome() {
        this.router.navigate(['/home']);
    }
    applyChanges(): void {
        if (this.initialLanguage.value !== this.selectedLanguage.value || this.initialTheme.value !== this.selectedTheme.value) {
            console.log("il y'a des changements");
        }
    }
}

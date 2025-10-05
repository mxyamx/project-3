import { DropdownOption } from '@app/interfaces/dropdown-option';
import { InterfaceTheme } from '@common/enums/interfaceTheme';
import { Language } from '@common/enums/language';

export const LANGUAGES: DropdownOption<Language>[] = [
    { value: Language.french, viewValue: 'Français' },
    { value: Language.english, viewValue: 'English' },
];

export const THEMES: DropdownOption<InterfaceTheme>[] = [
    { value: InterfaceTheme.Dark, viewValue: 'Sombre' },
    { value: InterfaceTheme.Light, viewValue: 'Clair' },
];

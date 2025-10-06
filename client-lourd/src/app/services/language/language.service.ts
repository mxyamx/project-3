import { Injectable } from '@angular/core';
import { LANGUAGE_STORAGE_KEY } from '@app/constants/settings-constant';
import { Language } from '@common/enums/language';
import { TranslateService } from '@ngx-translate/core';
import { LocalStorageService } from '../local-storage/local-storage.service';

@Injectable({
    providedIn: 'root',
})
export class LanguageService {
    private readonly baseLang: Language = Language.french;
    private readonly langs: Language[] = [Language.french, Language.english];
    currentLanguage: Language = this.baseLang;

    constructor(
        private localStorageService: LocalStorageService,
        private translate: TranslateService,
    ) {
        const langCode = this.translate.getCurrentLang();
        this.currentLanguage = this.langs.find((lang) => lang === langCode) || this.baseLang;

        this.translate.onLangChange.subscribe((event) => {
            this.currentLanguage = this.langs.find((lang) => lang === event.lang) || this.baseLang;
        });
    }

    initTranslate(): Language {
        this.translate.addLangs(this.langs);
        this.translate.setFallbackLang(this.baseLang);
        const lang: Language = this.getLocalPreferredLanguage();
        this.translate.use(lang);
        this.localStorageService.setItem(LANGUAGE_STORAGE_KEY, lang);
        return lang;
    }

    getLocalPreferredLanguage(): Language {
        this.translate.addLangs(this.langs);
        this.translate.setFallbackLang(this.baseLang);

        const storageLang: Language | null = this.localStorageService.getItem<Language>(LANGUAGE_STORAGE_KEY);

        const browserLangRaw: string = navigator.languages?.[0] || navigator.language || '';
        const browserLangCode = browserLangRaw.split('-')[0].toLowerCase();

        const browserLang = this.langs.find((lang) => lang === browserLangCode) || null;

        const lang: Language = storageLang && this.langs.includes(storageLang) ? storageLang : browserLang ? browserLang : this.baseLang;

        return lang;
    }

    setTranslate(lang: Language): void {
        this.translate.use(lang);
        this.localStorageService.setItem(LANGUAGE_STORAGE_KEY, lang);
    }
}

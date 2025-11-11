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

    constructor(
        private localStorageService: LocalStorageService,
        private translate: TranslateService,
    ) {
        this.translate.addLangs(this.langs);
        this.translate.setFallbackLang(this.baseLang);
    }

    initTranslate(): Language {
        const lang: Language = this.getLocalPreferredLanguage();
        this.translate.use(lang);
        this.localStorageService.setItem(LANGUAGE_STORAGE_KEY, lang);
        return lang;
    }

    getLocalPreferredLanguage(): Language {
        this.translate.addLangs(this.langs);
        this.translate.setFallbackLang(this.baseLang);

        const storageLangCode = this.localStorageService.getItem<string>(LANGUAGE_STORAGE_KEY);
        const storageLang = this.coerceSupported(storageLangCode);

        const browserLangRaw: string = navigator.languages?.[0] || navigator.language || '';
        const browserLangCode = browserLangRaw.split('-')[0].toLowerCase();

        const browserLang = this.coerceSupported(browserLangCode);

        const lang: Language = storageLang ? storageLang : browserLang ? browserLang : this.baseLang;

        return lang;
    }

    setTranslate(lang: Language): void {
        this.translate.use(lang);
        this.localStorageService.setItem(LANGUAGE_STORAGE_KEY, lang);
    }

    private coerceSupported(code: string | null): Language | null {
        if (!code) return null;
        return this.langs.find((lang) => lang === code) || null;
    }
}

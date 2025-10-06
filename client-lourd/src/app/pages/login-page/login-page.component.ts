import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DropdownComponent } from '@app/components/dropdown/dropdown.component';
import { ProfileAvatarImgComponent } from '@app/components/profile-avatar-img/profile-avatar-img.component';
import { AuthentificationService } from '@app/services/authentification/authentification.service';
import { HttpUserService } from '@app/services/http-manager/http-users.service';
import { LanguageService } from '@app/services/language/language.service';
import { UserManagerService } from '@app/services/user-manager/user-manager.service';
import { DeviceType } from '@common/enums/deviceType';
import { Language } from '@common/enums/language';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

const MIN_LENGTH = 3;
const MAX_LENGTH = 14;

@Component({
    selector: 'app-login-page',
    imports: [ReactiveFormsModule, ProfileAvatarImgComponent, CommonModule, TranslatePipe, DropdownComponent],
    templateUrl: './login-page.component.html',
    styleUrl: './login-page.component.scss',
})
export class LoginPageComponent implements OnInit {
    isLogin = true;

    private authService: AuthentificationService = inject(AuthentificationService);
    private httpUserService: HttpUserService = inject(HttpUserService);
    private userManager: UserManagerService = inject(UserManagerService);
    private translateService: TranslateService = inject(TranslateService);
    private languageService = inject(LanguageService);
    constructor(private router: Router) {}

    selectedAvatars: Set<string> = new Set();
    readonly languages = [Language.french, Language.english];

    formGroup = new FormGroup({
        username: new FormControl('', []),
        email: new FormControl('', [Validators.required, Validators.email]),
        password: new FormControl('', [Validators.required]),
        confirmPassword: new FormControl(''),
        avatar: new FormControl(''),
    });

    errorMessage: string = '';
    selectedAvatar: string | null = null;
    uploadAvatar = false;
    uploadedAvatarPreview: string | null = null;
    selectedLanguage: Language = Language.french;

    ngOnInit(): void {
        const langCode = this.languageService.initTranslate();
        this.selectedLanguage = this.languages.find((lang) => lang === langCode) || Language.french;
    }

    toggleAuth(event: Event) {
        event.preventDefault();
        this.isLogin = !this.isLogin;
        this.errorMessage = '';
        this.formGroup.reset();
        const usernameControl = this.formGroup.get('username');
        const confirmPasswordControl = this.formGroup.get('confirmPassword');
        const avatarControl = this.formGroup.get('avatar');

        if (!this.isLogin) {
            usernameControl?.setValidators([Validators.required, Validators.minLength(MIN_LENGTH), Validators.maxLength(MAX_LENGTH)]);
            confirmPasswordControl?.setValidators([Validators.required]);
            avatarControl?.setValidators([Validators.required]);
        } else {
            usernameControl?.clearValidators();
            confirmPasswordControl?.clearValidators();
            avatarControl?.clearValidators();
        }

        usernameControl?.updateValueAndValidity();
        confirmPasswordControl?.updateValueAndValidity();
        avatarControl?.updateValueAndValidity();
    }

    async onLogin(): Promise<void> {
        const emailControl = this.formGroup.get('email');

        if (emailControl?.hasError('email')) {
            this.errorMessage = this.translateService.instant('login-page.email.invalid');
            emailControl.markAsTouched();
            return;
        }

        if (this.formGroup.invalid) {
            this.errorMessage = this.translateService.instant('login-page.error.missing-fields');
            this.formGroup.markAllAsTouched();
            return;
        }

        const { email, password } = this.formGroup.value;

        try {
            await this.authService.login(email!, password!);
            const userId = this.authService.getCurrentUserId();
            if (!userId) {
                this.errorMessage = this.translateService.instant('login-page.error.user');
                return;
            }

            this.httpUserService.getUser(userId).subscribe({
                next: (user) => {
                    if (user.status !== 'offline') {
                        this.errorMessage = this.translateService.instant('login-page.error.already-online');
                        return;
                    }

                    const updatedUser = { ...user, status: DeviceType.web };
                    this.httpUserService.updateUser(updatedUser).subscribe({
                        next: () => {
                            this.userManager.currentUser.set(updatedUser);
                            this.languageService.setTranslate(updatedUser.parameters.language);
                            this.router.navigate(['/home']);
                        },
                        error: (err) => {
                            this.errorMessage = err.message || this.translateService.instant('login-page.error.connection');
                        },
                    });
                },
                error: (err) => (this.errorMessage = err.message),
            });
        } catch (err: any) {
            this.errorMessage = this.translateService.instant(this.authService.mapFirebaseErrors(err.code));
        }
    }

    async onSignup() {
        const emailControl = this.formGroup.get('email');

        if (emailControl?.hasError('email')) {
            this.errorMessage = this.translateService.instant('login-page.email.invalid');
            emailControl.markAsTouched();
            return;
        }

        if (this.formGroup.invalid) {
            this.errorMessage = this.translateService.instant('login-page.error.missing-fields');
            this.formGroup.markAllAsTouched();
            return;
        }

        const { username, email, password, confirmPassword, avatar } = this.formGroup.value;

        if (password !== confirmPassword) {
            this.errorMessage = this.translateService.instant('login-page.password.identical');
            return;
        }

        this.httpUserService.getAllUsers().subscribe({
            next: async (users) => {
                const usernameTaken = users.some((user) => user.username === username) || username === '[supprimé]';
                if (usernameTaken) {
                    this.errorMessage = this.translateService.instant('login-page.create.username.taken');
                    return;
                }

                try {
                    await this.authService.signup(email!, password!);

                    const userId = this.authService.getCurrentUserId();
                    if (!userId) {
                        this.errorMessage = this.translateService.instant('login-page.error.user-id');
                        return;
                    }

                    this.userManager.setId(userId);
                    this.userManager.setUsername(username!);
                    this.userManager.setEmail(email!);
                    this.userManager.setAvatar(avatar!);
                    this.userManager.setParameters({ language: this.selectedLanguage });
                    console.log(this.userManager.getCurrentUser());

                    this.httpUserService.createUser(this.userManager.getCurrentUser()).subscribe({
                        next: () => this.router.navigate(['/home']),
                        error: (err) => {
                            this.errorMessage = err.message || this.translateService.instant('general.server-error');
                        },
                    });
                } catch (err: any) {
                    this.errorMessage = this.translateService.instant(this.authService.mapFirebaseErrors(err.code));
                }
            },
            error: () => {
                this.errorMessage = this.translateService.instant('login-page.error.general');
            },
        });
    }

    getErrorMessage(field: string): string {
        const control = this.formGroup.get(field);
        if (!control || !control.errors) return '';

        if (control.errors['required']) {
            const key = field === 'username' ? 'login-page.create.username.required' : 'login-page.required';
            return this.translateService.instant(key);
        }
        if (control.errors['minlength']) return this.translateService.instant('login-page.min-length', { min: MIN_LENGTH });
        if (control.errors['maxlength']) return this.translateService.instant('login-page.max-length', { max: MAX_LENGTH });
        return '';
    }

    clearError() {
        this.errorMessage = '';
    }

    toggleAvatarMode() {
        this.uploadAvatar = !this.uploadAvatar;
        this.formGroup.get('avatar')?.setValue('');
        this.uploadedAvatarPreview = null;
    }

    avatarSelected(image: string | null) {
        this.selectedAvatar = image;
        this.formGroup.get('avatar')?.setValue(image);
        this.formGroup.get('avatar')?.markAsTouched();
        this.clearError();
    }

    onFileSelected(event: Event) {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const MAX_WIDTH = 200;
                const MAX_HEIGHT = 200;
                let { width, height } = img;

                if (width > MAX_WIDTH || height > MAX_HEIGHT) {
                    const scale = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
                    width = width * scale;
                    height = height * scale;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                ctx.drawImage(img, 0, 0, width, height);

                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);

                this.selectedAvatar = compressedDataUrl;
                this.uploadedAvatarPreview = compressedDataUrl;
                this.formGroup.get('avatar')?.setValue(compressedDataUrl);
            };
            img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
    }
    onLanguageChange() {
        this.languageService.setTranslate(this.selectedLanguage);
    }
}

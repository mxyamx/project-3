import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthentificationService } from '@app/services/authentification/authentification.service';
import { HttpUserService } from '@app/services/http-manager/http-users.service';
import { UserManagerService } from '@app/services/user-manager/user-manager.service';

const MIN_LENGTH = 3;
const MAX_LENGTH = 14;

@Component({
    selector: 'app-login-page',
    imports: [ReactiveFormsModule],
    templateUrl: './login-page.component.html',
    styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
    isLogin = true;

    private authService: AuthentificationService = inject(AuthentificationService);
    private httpUserService: HttpUserService = inject(HttpUserService);
    private userManager: UserManagerService = inject(UserManagerService);
    constructor(private router: Router) {}

    formGroup = new FormGroup({
        username: new FormControl('', []),
        email: new FormControl('', [Validators.required, Validators.email]),
        password: new FormControl('', [Validators.required]),
        confirmPassword: new FormControl(''),
        avatar: new FormControl(''),
    });

    errorMessage: string = '';
    selectedAvatar: string = '';

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
            usernameControl?.updateValueAndValidity();
            confirmPasswordControl?.updateValueAndValidity();
            avatarControl?.updateValueAndValidity();
        }
    }

    async onLogin(): Promise<void> {
        if (this.formGroup.invalid) {
            this.errorMessage = 'Veuillez remplir tous les champs.';
            this.formGroup.markAllAsTouched();
            return;
        }

        const { email, password } = this.formGroup.value;

        try {
            await this.authService.login(email!, password!);
            const userId = this.authService.getCurrentUserId();
            if (!userId) {
                this.errorMessage = "Impossible de récupérer l'utilisateur.";
                return;
            }

            this.httpUserService.getUser(userId).subscribe({
                next: (user) => {
                    if (user.status !== 'offline') {
                        this.errorMessage = 'Cet utilisateur est déjà en ligne.';
                        return;
                    }
                    this.userManager.currentUser.set(user);
                    this.router.navigate(['/home']);
                },
                error: (err) => (this.errorMessage = err.message),
            });
        } catch (err: any) {
            this.errorMessage = this.authService.mapFirebaseErrors(err.code);
        }
    }

    async onSignup() {
        if (this.formGroup.invalid) {
            this.errorMessage = 'Veuillez remplir tous les champs.';
            this.formGroup.markAllAsTouched();
            return;
        }

        const { username, email, password, confirmPassword, avatar } = this.formGroup.value;

        if (password !== confirmPassword) {
            this.errorMessage = 'Le mot de passe et sa confirmation doivent être identiques.';
            return;
        }

        try {
            this.httpUserService.checkUsername(username!).subscribe({
                next: async (isAvailable) => {
                    if (!isAvailable) {
                        this.errorMessage = 'Ce pseudonyme est déjà utilisé.';
                        return;
                    }

                    await this.authService.signup(email!, password!);

                    const userId = this.authService.getCurrentUserId();
                    if (!userId) {
                        this.errorMessage = "Impossible de récupérer l'ID utilisateur.";
                        return;
                    }

                    this.userManager.setId(userId);
                    this.userManager.setUsername(username!);
                    this.userManager.setEmail(email!);
                    this.userManager.setAvatar(avatar!);
                    console.log(this.userManager.getCurrentUser());

                    this.httpUserService.createUser(this.userManager.getCurrentUser()).subscribe({
                        next: () => this.router.navigate(['/home']),
                        error: (err) => {
                            console.error('Backend error:', err);
                            this.errorMessage = err.message || 'Une erreur serveur est survenue.';
                        },
                    });
                },
                error: (err) => {
                    console.error('Username check error:', err);
                    this.errorMessage = 'Il y a eu une erreur lors de la vérification du pseudonyme. Veuillez réessayer.';
                },
            });
        } catch (err: any) {
            this.errorMessage = this.authService.mapFirebaseErrors(err.code);
        }
    }

    getErrorMessage(field: string): string {
        const control = this.formGroup.get(field);
        if (!control || !control.errors) return '';

        if (control.errors['required']) {
            return field === 'username' ? 'Pseudonyme requis' : 'Champ requis';
        }
        if (control.errors['minlength']) return `Minimum ${MIN_LENGTH} caractères`;
        if (control.errors['maxlength']) return `Maximum ${MAX_LENGTH} caractères`;
        return '';
    }

    clearError() {
        this.errorMessage = '';
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
                this.formGroup.get('avatar')?.setValue(compressedDataUrl);
            };
            img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
    }
}

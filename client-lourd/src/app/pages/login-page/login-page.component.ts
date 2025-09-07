import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ProfileAvatarImgComponent } from '@app/components/profile-avatar-img/profile-avatar-img.component';
import { AuthentificationService } from '@app/services/authentification/authentification.service';
import { HttpUserService } from '@app/services/http-manager/http-users.service';
import { UserManagerService } from '@app/services/user-manager/user-manager.service';

const MIN_LENGTH = 3;
const MAX_LENGTH = 14;

@Component({
    selector: 'app-login-page',
    imports: [ReactiveFormsModule, ProfileAvatarImgComponent],
    templateUrl: './login-page.component.html',
    styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
    isLogin = true;

    private authService: AuthentificationService = inject(AuthentificationService);
    private httpUserService: HttpUserService = inject(HttpUserService);
    private userManager: UserManagerService = inject(UserManagerService);
    constructor(private router: Router) {}
    selectedAvatars: Set<string> = new Set();

    formGroup = new FormGroup({
        username: new FormControl('', []),
        email: new FormControl('', [Validators.required, Validators.email]),
        password: new FormControl('', [Validators.required]),
        confirmPassword: new FormControl(''),
        avatar: new FormControl(''),
    });

    errorMessage: string = '';
    selectedAvatar: string | null = null;

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

        this.httpUserService.getAllUsers().subscribe({
            next: async (users) => {
                const usernameTaken = users.some((user) => user.username === username) || username === '[supprimé]';
                if (usernameTaken) {
                    this.errorMessage = 'Ce pseudonyme est déjà utilisé ou non autorisé.';
                    return;
                }

                try {
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
                            this.errorMessage = err.message || 'Une erreur serveur est survenue.';
                        },
                    });
                } catch (err: any) {
                    this.errorMessage = this.authService.mapFirebaseErrors(err.code);
                }
            },
            error: () => {
                this.errorMessage = 'Une erreur est survenue. Veuillez réessayer.';
            },
        });
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

    avatarSelected(image: string | null) {
        this.selectedAvatar = image;
        this.formGroup.get('avatar')?.setValue(image);
        this.formGroup.get('avatar')?.markAsTouched();
    }
}

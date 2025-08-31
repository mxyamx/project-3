import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthentificationService } from '@app/services/authentification/authentification.service';

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
    constructor(private router: Router) {}

    formGroup = new FormGroup({
        username: new FormControl('', [Validators.required, Validators.minLength(MIN_LENGTH), Validators.maxLength(MAX_LENGTH)]),
        password: new FormControl('', [Validators.required]),
        confirmPassword: new FormControl(''),
    });

    errorMessage: string = '';

    toggleAuth(event: Event) {
        event.preventDefault();
        this.isLogin = !this.isLogin;
        this.errorMessage = '';
        this.formGroup.reset();
        const confirmPasswordControl = this.formGroup.get('confirmPassword');

        if (!this.isLogin) {
            confirmPasswordControl?.setValidators([Validators.required]);
            confirmPasswordControl?.updateValueAndValidity();
        }
    }

    async onLogin() {
        if (this.formGroup.invalid) {
            this.errorMessage = 'Veuillez remplir tous les champs.';
            this.formGroup.markAllAsTouched();
            return;
        }

        const { username, password } = this.formGroup.value;

        try {
            await this.authService.login(username!, password!);
            this.errorMessage = '';
            this.router.navigate(['/home']);
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

        const { username, password, confirmPassword } = this.formGroup.value;

        if (password !== confirmPassword) {
            this.errorMessage = 'Le mot de passe et sa confirmation doivent être identiques.';
            return;
        }

        try {
            await this.authService.signup(username!, password!);
            this.errorMessage = '';
            this.router.navigate(['/home']);
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
}

import { Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { app } from 'src/firebase-config';

@Injectable({
    providedIn: 'root',
})
export class AuthentificationService {
    auth: Auth;

    private EMAIL_DOMAIN: string = 'mechantepatte.com';

    constructor() {
        this.auth = getAuth(app);
    }

    signup(username: string, password: string) {
        const fakeEmail = this.emailCreation(username);
        return createUserWithEmailAndPassword(this.auth, fakeEmail, password);
    }

    login(username: string, password: string) {
        const fakeEmail = this.emailCreation(username);
        return signInWithEmailAndPassword(this.auth, fakeEmail, password);
    }

    logout() {
        return this.auth.signOut();
    }

    getUsernameFromEmail(email: string): string {
        return email.split('@')[0];
    }

    mapFirebaseErrors(errorCode: string): string {
        switch (errorCode) {
            case 'auth/user-not-found':
                return 'Utilisateur non trouvé';
            case 'auth/invalid-credential':
                return "Informations d'identification invalides";
            case 'auth/email-already-in-use':
                return 'Le pseudonyme est déjà utilisé';
            case 'auth/weak-password':
                return 'Le mot de passe doit comporter au moins 6 caractères';
            case 'auth/invalid-email':
                return 'Pseudonyme invalide';
            default:
                return 'Une erreur est survenue, veuillez réessayer';
        }
    }

    private emailCreation(username: string) {
        return `${username}@${this.EMAIL_DOMAIN}`;
    }
}

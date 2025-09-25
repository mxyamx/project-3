import { Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { app } from 'src/firebase-config';

@Injectable({
    providedIn: 'root',
})
export class AuthentificationService {
    auth: Auth;

    constructor() {
        this.auth = getAuth(app);
    }

    signup(email: string, password: string) {
        return createUserWithEmailAndPassword(this.auth, email, password);
    }

    login(email: string, password: string) {
        return signInWithEmailAndPassword(this.auth, email, password);
    }

    logout() {
        return this.auth.signOut();
    }

    getCurrentUserId(): string | undefined {
        const user = this.auth.currentUser;
        return user ? user.uid : undefined;
    }

    mapFirebaseErrors(errorCode: string): string {
        switch (errorCode) {
            case 'auth/user-not-found':
                return 'Utilisateur non trouvé';
            case 'auth/invalid-credential':
                return "Informations d'authentification invalides";
            case 'auth/email-already-in-use':
                return 'Le courriel est déjà utilisé';
            case 'auth/weak-password':
                return 'Le mot de passe doit comporter au moins 6 caractères';
            case 'auth/invalid-email':
                return 'Courriel invalide';
            case 'auth/network-request-failed':
                return 'Échec de la connexion réseau. Vérifiez votre Internet.';
            default:
                return 'Une erreur est survenue, veuillez réessayer';
        }
    }
}

import { Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, updateEmail, updateProfile } from 'firebase/auth';
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

    deleteAccount() {
        const user = this.auth.currentUser;
        return user?.delete();
    }

    logout() {
        return this.auth.signOut();
    }

    getCurrentUserId(): string | undefined {
        const user = this.auth.currentUser;
        return user ? user.uid : undefined;
    }

    async updateCurrentUserEmail(newEmail: string) {
        const user = this.auth.currentUser;
        if (!user) throw new Error('No authenticated user');
        await updateEmail(user, newEmail);
    }

    async updateCurrentUserProfile(displayName?: string, photoURL?: string) {
        const user = this.auth.currentUser;
        if (!user) throw new Error('No authenticated user');
        await updateProfile(user, {
            displayName: displayName ?? user.displayName ?? undefined,
            photoURL: photoURL ?? user.photoURL ?? undefined,
        });
    }

    mapFirebaseErrors(errorCode: string): string {
        switch (errorCode) {
            case 'auth/user-not-found':
                return 'login-page.error.firebase.user-not-found';
            case 'auth/invalid-credential':
                return 'login-page.error.firebase.invalid-credential';
            case 'auth/email-already-in-use':
                return 'login-page.error.firebase.email-already-in-use';
            case 'auth/weak-password':
                return 'login-page.error.firebase.weak-password';
            case 'auth/invalid-email':
                return 'login-page.error.firebase.invalid-email';
            case 'auth/network-request-failed':
                return 'login-page.error.firebase.network-request-failed';
            default:
                return 'login-page.error.general';
        }
    }
}

import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthentificationService } from '@app/services/authentification/authentification.service';
import { HttpUserService } from '@app/services/http-manager/http-users.service';
import { UserManagerService } from '@app/services/user-manager/user-manager.service';
import { DeviceType } from '@common/enums/deviceType';
import { ActiveTab } from '@common/enums/profile-tabs';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-profile-page',
    imports: [CommonModule, TranslatePipe, ReactiveFormsModule],
    templateUrl: './profile-page.component.html',
    styleUrl: './profile-page.component.scss',
})
export class ProfilePageComponent {
    private userManager: UserManagerService = inject(UserManagerService);
    private authService: AuthentificationService = inject(AuthentificationService);
    private httpUserService: HttpUserService = inject(HttpUserService);
    private fb: FormBuilder = inject(FormBuilder);

    DeviceType = DeviceType;
    ActiveTab = ActiveTab;

    private router: Router = inject(Router);

    user = this.userManager.currentUser();
    activeTab = ActiveTab.Socials;

    PRESET_AVATARS: string[] = [
        'assets/profiles/bear-modified.png',
        'assets/profiles/bull-modified.png',
        'assets/profiles/elephant-modified.png',
        'assets/profiles/flamingo-modified.png',
        'assets/profiles/deer-modified.png',
        'assets/profiles/hyena-modified.png',
    ];
    selectedAvatarIndex = signal<number | null>(null);

    // ========= UI state =========
    deleteAccountWarning = false;
    isEditing = false;
    saving = false;
    editError = '';
    editForm: FormGroup = this.fb.group({
        username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(32)]],
        email: ['', [Validators.required, Validators.email]],
        avatar: ['', [Validators.required]], // must choose one
    });
    avatarPreview = signal<string>('');

    // ========= Navigation =========
    goHome() {
        this.router.navigate(['/home']);
    }

    // ========= Delete flow =========
    showDeletePopup() {
        this.deleteAccountWarning = true;
    }
    hideDeletePopup() {
        this.deleteAccountWarning = false;
    }
    confirmDelete() {
        this.deleteAccount();
        this.deleteAccountWarning = false;
    }
    deleteAccount() {
        const userId = this.authService.getCurrentUserId();
        if (userId) {
            this.authService.deleteAccount();
            this.httpUserService.deleteUser(userId).subscribe();
        }
        this.router.navigate(['/']);
    }

    editAccount() {
        this.editForm.reset({
            username: this.user.username,
            email: this.user.email,
            avatar: this.user.avatar ?? '',
        });

        // preselect avatar if it's in the preset list
        const idx = this.PRESET_AVATARS.indexOf(this.user.avatar || '');
        this.selectedAvatarIndex.set(idx >= 0 ? idx : null);
        this.avatarPreview.set(idx >= 0 ? this.PRESET_AVATARS[idx] : this.user.avatar || '');

        this.editError = '';
        this.isEditing = true;
    }

    closeEdit() {
        if (this.saving) return;
        this.isEditing = false;
        this.editError = '';
        this.editForm.reset();
        this.selectedAvatarIndex.set(null);
    }

    chooseAvatar(index: number) {
        const path = this.PRESET_AVATARS[index];
        this.selectedAvatarIndex.set(index);
        this.editForm.patchValue({ avatar: path });
        this.avatarPreview.set(path);
    }

    async saveEdit() {
        if (this.editForm.invalid) {
            this.editForm.markAllAsTouched();
            return;
        }

        const { username, email, avatar } = this.editForm.value as { username: string; email: string; avatar: string };
        if (!this.PRESET_AVATARS.includes(avatar)) {
            this.editError = 'Veuillez choisir un avatar valide.';
            return;
        }

        const nothingChanged = username === this.user.username && email === this.user.email && avatar === (this.user.avatar || '');
        if (nothingChanged) {
            this.isEditing = false;
            return;
        }

        this.saving = true;
        this.editError = '';

        try {
            if (email !== this.user.email) await this.authService.updateCurrentUserEmail(email);
            await this.authService.updateCurrentUserProfile(username, avatar);

            const payload = { ...this.user, username, email, avatar };

            // PUT /api/users/:id → 204 No Content
            await this.httpUserService.updateUser(payload).toPromise();

            Object.assign(this.user, payload);

            this.isEditing = false;
        } catch (err: any) {
            const msg = err?.error?.error?.toString()?.toLowerCase?.() || err?.message?.toLowerCase?.() || '';

            if (err?.status === 400 || (msg.includes('username') && msg.includes('exist')) || err?.error?.code === 'USERNAME_TAKEN') {
                this.editError = 'Pseudonyme déjà utilisé';
            } else if (err?.code === 'auth/requires-recent-login') {
                this.editError = 'Pour modifier votre courriel, reconnectez-vous puis réessayez.';
            } else {
                this.editError = err?.error?.error || err?.message || 'Échec de la modification du compte.';
            }
        } finally {
            this.saving = false;
        }
    }
}

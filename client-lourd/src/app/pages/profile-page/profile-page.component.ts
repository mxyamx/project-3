import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatContainerComponent } from '@app/components/chat-container/chat-container.component';
import { assetFromId } from '@app/constants/avatar-catalog';
import { AuthentificationService } from '@app/services/authentification/authentification.service';
import { AvatarUploadService } from '@app/services/avatar-upload/avatar-upload.service';
import { ChatService } from '@app/services/chat/chat.service';
import { HttpUserService } from '@app/services/http-manager/http-users.service';
import { UserManagerService } from '@app/services/user-manager/user-manager.service';
import { DeviceType } from '@common/enums/deviceType';
import { ActiveTab } from '@common/enums/profile-tabs';
import { TranslatePipe } from '@ngx-translate/core';
import { SocialsPageComponent } from '../socials-page/socials-page.component';

@Component({
    selector: 'app-profile-page',
    imports: [CommonModule, TranslatePipe, ReactiveFormsModule, SocialsPageComponent, ChatContainerComponent],
    templateUrl: './profile-page.component.html',
    styleUrl: './profile-page.component.scss',
})
export class ProfilePageComponent {
    private userManager: UserManagerService = inject(UserManagerService);
    private authService: AuthentificationService = inject(AuthentificationService);
    private httpUserService: HttpUserService = inject(HttpUserService);
    private avatarUploadService: AvatarUploadService = inject(AvatarUploadService);
    private fb: FormBuilder = inject(FormBuilder);
    private router: Router = inject(Router);

    chatService: ChatService = inject(ChatService);

    DeviceType = DeviceType;
    ActiveTab = ActiveTab;

    userSig = this.userManager.currentUser.asReadonly();
    get user() {
        return this.userSig();
    }

    activeTab = ActiveTab.Socials;

    PRESET_AVATARS: string[] = [
        'assets/profiles/bear-modified.png',
        'assets/profiles/bull-modified.png',
        'assets/profiles/elephant-modified.png',
        'assets/profiles/flamingo-modified.png',
        'assets/profiles/deer-modified.png',
        'assets/profiles/hyena-modified.png',
    ];

    ALL_AVATARS = signal<string[]>([]);
    selectedAvatarIndex = signal<number | null>(null);

    deleteAccountWarning = false;
    isEditing = false;
    saving = false;
    editError = '';
    uploadingAvatar = false;
    uploadAvatarError = '';

    editForm: FormGroup = this.fb.group({
        username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(32)]],
        email: ['', [Validators.required, Validators.email]],
        avatar: ['', [Validators.required]],
    });
    avatarPreview = signal<string>('');

    ngOnInit() {
        this.rebuildAvatarList();
    }

    private rebuildAvatarList() {
        const purchasedIds = this.user.purchasedAvatars ?? [];
        const purchasedAssets = purchasedIds.map((id) => assetFromId(id)).filter((x): x is string => !!x);
        const uploadedAvatars = this.user.uploadedAvatars ?? [];
        const set = new Set<string>([...this.PRESET_AVATARS, ...purchasedAssets, ...uploadedAvatars]);
        this.ALL_AVATARS.set([...set]);
    }

    // ========= Statistics Helpers =========
    get totalVictories(): number {
        return this.user.statistics?.victoryAmount ?? 0;
    }

    get normalVictories(): number {
        return this.user.statistics?.victoriesNormal ?? 0;
    }

    get ctfVictories(): number {
        return this.user.statistics?.victoriesCTF ?? 0;
    }

    get totalGamesPlayed(): number {
        return this.user.statistics?.gamesPlayed ?? 0;
    }

    get normalGamesPlayed(): number {
        return this.user.statistics?.gamesPlayedNormal ?? 0;
    }

    get ctfGamesPlayed(): number {
        return this.user.statistics?.gamesPlayedCTF ?? 0;
    }

    get averageGameTimeSeconds(): number {
        const stats = this.user?.statistics;
        if (!stats || !stats.gamesPlayed) return 0;
        return (stats.totalGameDuration ?? 0) / stats.gamesPlayed / 1000;
    }

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

    // ========= Edit Account =========
    editAccount() {
        this.rebuildAvatarList();

        const u = this.user;
        this.editForm.reset({ username: u.username, email: u.email, avatar: u.avatar ?? '' });

        const all = this.ALL_AVATARS();
        const idx = all.indexOf(u.avatar || '');
        this.selectedAvatarIndex.set(idx >= 0 ? idx : null);
        this.avatarPreview.set(idx >= 0 ? all[idx] : u.avatar || '');

        this.editError = '';
        this.uploadAvatarError = '';
        this.isEditing = true;
    }

    closeEdit() {
        if (this.saving || this.uploadingAvatar) return;
        this.isEditing = false;
        this.editError = '';
        this.uploadAvatarError = '';
        this.editForm.reset();
        this.selectedAvatarIndex.set(null);
    }

    chooseAvatar(index: number) {
        const all = this.ALL_AVATARS();
        const path = all[index];
        this.selectedAvatarIndex.set(index);
        this.editForm.patchValue({ avatar: path });
        this.avatarPreview.set(path);
    }

    // ========= Avatar Upload =========
    async onAvatarFileSelected(event: Event) {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        this.uploadingAvatar = true;
        this.uploadAvatarError = '';

        try {
            // Convert file to base64 data URL
            const dataUrl = await this.avatarUploadService.fileToDataUrl(file);

            // Get current uploaded avatars
            const uploadedAvatars = [...(this.user.uploadedAvatars ?? [])];

            // Add new avatar if not already present
            if (!uploadedAvatars.includes(dataUrl)) {
                uploadedAvatars.push(dataUrl);

                // Update user in database
                const updatedUser = { ...this.user, uploadedAvatars };
                await this.httpUserService.updateUser(updatedUser).toPromise();

                // Update local user manager
                this.userManager.setUploadedAvatars(uploadedAvatars);

                // Rebuild avatar list
                this.rebuildAvatarList();

                // Select the newly uploaded avatar
                const all = this.ALL_AVATARS();
                const idx = all.indexOf(dataUrl);
                if (idx >= 0) {
                    this.chooseAvatar(idx);
                }
            } else {
                // Avatar already exists, just select it
                const all = this.ALL_AVATARS();
                const idx = all.indexOf(dataUrl);
                if (idx >= 0) {
                    this.chooseAvatar(idx);
                }
            }
        } catch (err: any) {
            console.error('Avatar upload error:', err);
            this.uploadAvatarError = err?.message || 'profil-page.edit-modal.error.upload-failed';
        } finally {
            this.uploadingAvatar = false;
            // Reset file input
            (event.target as HTMLInputElement).value = '';
        }
    }

    async saveEdit() {
        if (this.editForm.invalid) {
            this.editForm.markAllAsTouched();
            return;
        }

        const { username, email, avatar } = this.editForm.value as { username: string; email: string; avatar: string };

        if (!this.ALL_AVATARS().includes(avatar)) {
            this.editError = 'profil-page.edit-modal.error.required-avatar';
            return;
        }

        const u = this.user;
        const nothingChanged = username === u.username && email === u.email && avatar === (u.avatar || '');
        if (nothingChanged) {
            this.isEditing = false;
            return;
        }

        this.saving = true;
        this.editError = '';

        try {
            if (email !== u.email) await this.authService.updateCurrentUserEmail(email);

            // FIX: Only update Firebase photoURL for preset avatars (starts with 'assets/')
            // Custom base64 avatars are too long for Firebase Auth
            if (avatar.startsWith('assets/')) {
                await this.authService.updateCurrentUserProfile(username, avatar);
            } else {
                await this.authService.updateCurrentUserProfile(username, undefined);
            }

            const payload = { ...u, username, email, avatar };
            await this.httpUserService.updateUser(payload).toPromise();

            this.userManager.setUsername(username);
            this.userManager.setEmail(email);
            this.userManager.setAvatar(avatar);

            this.isEditing = false;
        } catch (err: any) {
            const msg = err?.error?.error?.toString()?.toLowerCase?.() || err?.message?.toLowerCase?.() || '';
            if (err?.status === 400 || (msg.includes('username') && msg.includes('exist')) || err?.error?.code === 'USERNAME_TAKEN') {
                this.editError = 'profil-page.edit-modal.error.used-username';
            } else if (err?.code === 'auth/requires-recent-login') {
                this.editError = 'profil-page.edit-modal.error.connection';
            } else {
                this.editError = err?.error?.error || err?.message || 'profil-page.edit-modal.error.general';
            }
        } finally {
            this.saving = false;
        }
    }

    openChat() {
        this.chatService.showChat.set(!this.chatService.showChat());
    }

    // Helper to check if avatar is custom uploaded
    isCustomAvatar(avatarUrl: string): boolean {
        return this.avatarUploadService.isCustomAvatar(avatarUrl);
    }
}

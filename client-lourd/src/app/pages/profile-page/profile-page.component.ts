import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { assetFromId } from '@app/constants/avatar-catalog';
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
    private router: Router = inject(Router);

    DeviceType = DeviceType;
    ActiveTab = ActiveTab;

    /** Hold the signal… */
    userSig = this.userManager.currentUser.asReadonly();
    /** …and expose a plain object for template/class usage */
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
        const set = new Set<string>([...this.PRESET_AVATARS, ...purchasedAssets]);
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

    editAccount() {
        this.rebuildAvatarList();

        const u = this.user;
        this.editForm.reset({ username: u.username, email: u.email, avatar: u.avatar ?? '' });

        const all = this.ALL_AVATARS();
        const idx = all.indexOf(u.avatar || '');
        this.selectedAvatarIndex.set(idx >= 0 ? idx : null);
        this.avatarPreview.set(idx >= 0 ? all[idx] : u.avatar || '');

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
        const all = this.ALL_AVATARS();
        const path = all[index];
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
            await this.authService.updateCurrentUserProfile(username, avatar);

            const payload = { ...u, username, email, avatar };
            await this.httpUserService.updateUser(payload).toPromise();

            // reflect UI state immediately
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
}

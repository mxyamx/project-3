import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatContainerComponent } from '@app/components/chat-container/chat-container.component';
import { AvatarDef, avatarList } from '@app/constants/avatar-catalog';
import { SfxDef, sfxList } from '@app/constants/sound-catalog';
import { ChatService } from '@app/services/chat/chat.service';
import { HttpUserService } from '@app/services/http-manager/http-users.service';
import { UserManagerService } from '@app/services/user-manager/user-manager.service';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-shop-page',
    standalone: true,
    imports: [CommonModule, TranslatePipe, ReactiveFormsModule, ChatContainerComponent],
    templateUrl: './shop-page.component.html',
    styleUrl: './shop-page.component.scss',
})
export class ShoppingPageComponent {
    private router = inject(Router);
    private userManager = inject(UserManagerService);
    private httpUser = inject(HttpUserService);
    private audioMap = new Map<string, HTMLAudioElement>();

    chatService: ChatService = inject(ChatService);

    user = this.userManager.currentUser.asReadonly();
    catalog: AvatarDef[] = avatarList;
    sfxCatalog: SfxDef[] = sfxList;

    buying = signal<string | null>(null);
    errorMsg = signal<string>('');

    money = computed(() => this.user().money ?? 0);
    owned = computed(() => new Set(this.user().purchasedAvatars ?? []));
    ownedSfx = computed(() => new Set(this.user().purchasedSounds ?? []));
    selectedSound = computed(() => this.user().selectedSound);

    constructor() {
        // Preload sounds so preview is instant
        for (const s of this.sfxCatalog) {
            const a = new Audio(s.asset);
            a.preload = 'auto';
            this.audioMap.set(s.id, a);
        }
    }

    canAfford(item: AvatarDef) {
        return this.money() >= item.price;
    }
    isOwned(item: AvatarDef) {
        return this.owned().has(item.id);
    }

    goBack() {
        this.router.navigate(['/home']);
    }

    isEquippedSfx(s: SfxDef): boolean {
        return this.selectedSound() === s.id;
    }

    async equipSfx(s: SfxDef) {
        if (!this.isOwnedSfx(s)) return;

        this.errorMsg.set('');
        try {
            this.userManager.setSelectedSound(s.id);
            await this.httpUser.updateUser(this.userManager.getCurrentUser()).toPromise();
        } catch (e: any) {
            this.errorMsg.set(e?.error?.error || e?.message || "Erreur lors de l'équipement.");
        }
    }

    async buy(item: AvatarDef) {
        this.errorMsg.set('');
        if (this.isOwned(item)) return;
        if (!this.canAfford(item)) {
            this.errorMsg.set('Solde insuffisant.');
            return;
        }

        this.buying.set(item.id);
        try {
            // optimistic local state via UserManager
            this.userManager.setMoney(this.money() - item.price);
            const next = Array.from(this.owned());
            next.push(item.id);
            this.userManager.setPurchasedAvatars(next);

            // persist once with full updated user
            await this.httpUser.updateUser(this.userManager.getCurrentUser()).toPromise();
        } catch (e: any) {
            this.errorMsg.set(e?.error?.error || e?.message || 'Erreur lors de l’achat.');
        } finally {
            this.buying.set(null);
        }
    }

    equip(item: AvatarDef) {
        if (!this.isOwned(item)) return;
        this.userManager.setAvatar(item.asset);
        this.httpUser.updateUser(this.userManager.getCurrentUser()).subscribe();
    }

    canAffordSfx(s: SfxDef) {
        return this.money() >= s.price;
    }
    isOwnedSfx(s: SfxDef) {
        return this.ownedSfx().has(s.id);
    }

    playPreview(s: SfxDef) {
        // iOS/macOS: must be triggered by a user click—this function is bound to a click handler
        for (const a of this.audioMap.values()) {
            a.pause();
        } // stop any other preview
        const a = this.audioMap.get(s.id);
        if (!a) return;
        a.currentTime = 0;
        a.play().catch(() => {
            // swallow autoplay errors; user gesture should normally allow play
        });
    }

    stopPreview(s: SfxDef) {
        const a = this.audioMap.get(s.id);
        if (a) a.pause();
    }
    openChat() {
        this.chatService.showChat.set(!this.chatService.showChat());
    }
    async buySfx(s: SfxDef) {
        this.errorMsg.set('');
        if (this.isOwnedSfx(s)) return;
        if (!this.canAffordSfx(s)) {
            this.errorMsg.set('Solde insuffisant.');
            return;
        }

        this.buying.set(s.id);
        try {
            // Get current user state
            const currentUser = this.userManager.getCurrentUser();
            const currentSounds = currentUser.purchasedSounds || [];

            // Update money
            this.userManager.setMoney(this.money() - s.price);

            // Add new sound to array
            const updatedSounds = [...currentSounds, s.id];
            this.userManager.setPurchasedSounds(updatedSounds);

            // Auto-equip if first sound
            if (updatedSounds.length === 1) {
                this.userManager.setSelectedSound(s.id);
            }

            // Persist to database
            await this.httpUser.updateUser(this.userManager.getCurrentUser()).toPromise();
        } catch (e: any) {
            // Rollback on error
            this.errorMsg.set(e?.error?.error || e?.message || "Erreur lors de l'achat.");
            // TODO: reload user from server to reset state
        } finally {
            this.buying.set(null);
        }
    }
}

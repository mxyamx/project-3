import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpUserService } from '@app/services/http-manager/http-users.service';
import { UserManagerService } from '@app/services/user-manager/user-manager.service';
import { TranslatePipe } from '@ngx-translate/core';

interface AvatarItem {
    id: string; // stored in user.purchasedAvatars
    name: string;
    price: number;
    asset: string; // image path to equip
}

// exclusive avatars (not your default presets)
const AVATARS: AvatarItem[] = [
    { id: 'avt-wolf', name: 'Loup Alpha', price: 25, asset: 'assets/profiles/wolf-modified.png' },
    { id: 'avt-kangaroo', name: 'Kangourou Agile', price: 250, asset: 'assets/profiles/kangaroo-modified.png' },
    { id: 'avt-eagle', name: 'Aigle Royal', price: 300, asset: 'assets/profiles/eagle-modified.png' },
    { id: 'avt-lion', name: 'Lion Majestueux', price: 300, asset: 'assets/profiles/lion-modified.png' },
];

@Component({
    selector: 'app-shop-page',
    standalone: true,
    imports: [CommonModule, TranslatePipe, ReactiveFormsModule],
    templateUrl: './shop-page.component.html',
    styleUrl: './shop-page.component.scss',
})
export class ShoppingPageComponent {
    private router = inject(Router);
    private userManager = inject(UserManagerService);
    private httpUser = inject(HttpUserService);

    user = this.userManager.currentUser(); // same pattern as your profile page
    catalog = AVATARS;

    buying = signal<string | null>(null);
    errorMsg = signal<string>('');

    money = computed(() => this.user.money ?? 0);
    ownedSet = computed(() => new Set(this.user.purchasedAvatars ?? []));

    canAfford(item: AvatarItem) {
        return this.money() >= item.price;
    }
    isOwned(item: AvatarItem) {
        return this.ownedSet().has(item.id);
    }

    goBack() {
        this.router.navigate(['/home']);
    }

    async buy(item: AvatarItem) {
        this.errorMsg.set('');
        if (this.isOwned(item)) return;
        if (!this.canAfford(item)) {
            this.errorMsg.set('Solde insuffisant.');
            return;
        }

        this.buying.set(item.id);
        try {
            // mutate local user
            this.user.money = (this.user.money ?? 0) - item.price;
            if (!Array.isArray(this.user.purchasedAvatars)) this.user.purchasedAvatars = [];
            this.user.purchasedAvatars.push(item.id);

            // persist once
            await this.httpUser.updateUser(this.user).toPromise();

            // optional: auto-equip for instant feedback
            this.user.avatar = item.asset;
            await this.httpUser.updateUser(this.user).toPromise();
        } catch (e: any) {
            this.errorMsg.set(e?.error?.error || e?.message || 'Erreur lors de l’achat.');
        } finally {
            this.buying.set(null);
        }
    }

    equip(item: AvatarItem) {
        if (!this.isOwned(item)) return;
        this.user.avatar = item.asset;
        this.httpUser.updateUser(this.user).subscribe(); // fire-and-forget
    }
}

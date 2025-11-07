import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AvatarDef, avatarList } from '@app/constants/avatar-catalog';
import { HttpUserService } from '@app/services/http-manager/http-users.service';
import { UserManagerService } from '@app/services/user-manager/user-manager.service';
import { TranslatePipe } from '@ngx-translate/core';

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

    user = this.userManager.currentUser.asReadonly();
    catalog: AvatarDef[] = avatarList;

    buying = signal<string | null>(null);
    errorMsg = signal<string>('');

    money = computed(() => this.user().money ?? 0);
    owned = computed(() => new Set(this.user().purchasedAvatars ?? []));

    canAfford(item: AvatarDef) {
        return this.money() >= item.price;
    }
    isOwned(item: AvatarDef) {
        return this.owned().has(item.id);
    }

    goBack() {
        this.router.navigate(['/home']);
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
}

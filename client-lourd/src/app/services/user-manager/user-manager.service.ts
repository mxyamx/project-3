import { Injectable, signal, WritableSignal } from '@angular/core';
import { ProfileAvatar } from '@common/enums/avatar';
import { DeviceType } from '@common/enums/deviceType';
import { InterfaceTheme } from '@common/enums/interfaceTheme';
import { Language } from '@common/enums/language';
import { PlayerStatistics } from '@common/statistics';
import { User } from '@common/user';

@Injectable({
    providedIn: 'root',
})
export class UserManagerService {
    currentUser: WritableSignal<User> = signal(this.getDefaultUser());

    constructor() {}

    getDefaultUser(): User {
        return {
            id: '',
            username: 'DefaultUser',
            email: 'defaultuser@test.com',
            avatar: ProfileAvatar.Avatar1,
            friends: [],
            blocked: [],
            inventory: [],
            money: 50,
            parameters: { language: Language.french, theme: InterfaceTheme.Light },
            statistics: this.getDefaultStatistics(),
            status: DeviceType.web,
        };
    }

    getDefaultStatistics(): PlayerStatistics {
        return {
            combatAmount: 0,
            escapeAmount: 0,
            victoryAmount: 0,
            defeatAmount: 0,
            lifePointsLost: 0,
            lifePointsOpponentLost: 0,
            itemsCollected: 0,
            tilePercentage: 0,
        };
    }

    setUsername(username: string) {
        this.currentUser.update((curr) => ({ ...curr, username }));
    }

    setEmail(email: string) {
        this.currentUser.update((curr) => ({ ...curr, email }));
    }

    setAvatar(avatar: string) {
        this.currentUser.update((curr) => ({ ...curr, avatar }));
    }

    setMoney(money: number) {
        this.currentUser.update((curr) => ({ ...curr, money }));
    }

    setParameters(parameters: Partial<User['parameters']>) {
        this.currentUser.update((curr) => ({
            ...curr,
            parameters: { ...curr.parameters, ...parameters },
        }));
    }

    setStatistics(statistics: Partial<PlayerStatistics>) {
        this.currentUser.update((curr) => ({
            ...curr,
            statistics: { ...curr.statistics, ...statistics },
        }));
    }

    setStatus(status: DeviceType) {
        this.currentUser.update((curr) => ({ ...curr, status }));
    }

    setFriends(friends: User[]) {
        this.currentUser.update((curr) => ({ ...curr, friends }));
    }

    setBlocked(blocked: User[]) {
        this.currentUser.update((curr) => ({ ...curr, blocked }));
    }

    setInventory(inventory: string[]) {
        this.currentUser.update((curr) => ({ ...curr, inventory }));
    }

    setId(id: string) {
        this.currentUser.update((curr) => ({ ...curr, id }));
    }

    setPurchasedSounds(ids: string[]) {
        const u = this.getCurrentUser();
        this.currentUser.set({ ...u, purchasedSounds: ids });
    }

    setSelectedSound(soundId: string) {
        this.currentUser.update((curr) => ({ ...curr, selectedSound: soundId }));
    }

    setPurchasedAvatars(ids: string[]) {
        this.currentUser.update((curr) => ({ ...curr, purchasedAvatars: [...ids] }));
    }
    addPurchasedAvatar(id: string) {
        this.currentUser.update((curr) => {
            const old = new Set(curr.purchasedAvatars ?? []);
            old.add(id);
            return { ...curr, purchasedAvatars: Array.from(old) };
        });
    }

    getCurrentUser(): User {
        return structuredClone(this.currentUser());
    }

    resetUser() {
        this.currentUser.set(this.getDefaultUser());
    }
}

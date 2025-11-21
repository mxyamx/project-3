import { PlayerSlotState } from '@app/interfaces/player-slot-state';
import { Player } from '@common/player';

export class PlayerSlotManager {
    private readonly maxSlots: number;
    private readonly slots = new Map<string, PlayerSlotState>();

    constructor(maxSlots: number) {
        this.maxSlots = maxSlots;
    }

    registerInitialPlayer(player: Player): void {
        this.slots.set(player.userId, {
            userId: player.userId,
            eliminated: false,
            countsForSlot: true,
        });
    }

    markEliminated(userId: string): void {
        const state = this.slots.get(userId);
        if (!state) return;

        state.eliminated = true;
    }

    markDropOut(userId: string): void {
        const state = this.slots.get(userId);
        if (!state) return;

        if (!state.eliminated) {
            state.countsForSlot = false;
        }
    }

    markDropIn(player: Player): void {
        const existing = this.slots.get(player.userId);

        if (!existing) {
            if (!this.canJoinAsActive()) {
                throw new Error('No free slot for new player');
            }
            this.slots.set(player.userId, {
                userId: player.userId,
                eliminated: false,
                countsForSlot: true,
            });
            return;
        }

        if (existing.eliminated) {
            return;
        }

        if (!existing.countsForSlot) {
            if (!this.canJoinAsActive()) {
                return;
            }
            existing.countsForSlot = true;
        }
    }

    get occupiedSlots(): number {
        let count = 0;
        for (const state of this.slots.values()) {
            if (state.countsForSlot) ++count;
        }
        return count;
    }

    get freeSlots(): number {
        return this.maxSlots - this.occupiedSlots;
    }

    canJoinAsActive(): boolean {
        return this.freeSlots > 0;
    }

    isEliminated(userId: string): boolean {
        return this.slots.get(userId)?.eliminated ?? false;
    }

    isObserver(userId: string): boolean {
        const state = this.slots.get(userId);
        return !!state && state.eliminated;
    }
}

import { PlayerSlotState } from '@app/interfaces/player-slot-state';
import { CurrentGamesService } from '@app/services/current-games/current-games.service';
import { Player } from '@common/player';

export class PlayerSlotManager {
    private readonly maxSlots: number;
    private readonly slots = new Map<string, PlayerSlotState>();
    private gameId: string;
    private gameService: CurrentGamesService;
    constructor(maxSlots: number, gameService: CurrentGamesService, gameId: string) {
        this.maxSlots = maxSlots;
        this.gameService = gameService;
        this.gameId = gameId;
    }

    registerInitialPlayer(player: Player): void {
        this.slots.set(player.userId, {
            userId: player.userId,
            eliminated: false,
            countsForSlot: true,
        });

        this.gameService.setSlots(this.gameId, structuredClone(this.slots));
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
            this.gameService.setSlots(this.gameId, structuredClone(this.slots));
        }
    }

    markDropIn(player: Player): void {
        const existing = this.slots.get(player.userId);

        if (!existing) {
            if (!this.canJoinAsActive()) {
                return;
            }
            this.slots.set(player.userId, {
                userId: player.userId,
                eliminated: false,
                countsForSlot: true,
            });
            this.gameService.setSlots(this.gameId, structuredClone(this.slots));
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
            this.gameService.setSlots(this.gameId, structuredClone(this.slots));
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

import { Injectable } from '@angular/core';
import { TeleportationDataHelper, TeleportPair } from '@common/teleportation';
import { Tile } from '@common/tile';

@Injectable({
    providedIn: 'root',
})
export class GameplayTeleportationHelperService {
    private teleportPairs: Map<string, TeleportPair> = new Map();

    /**
     * Initialize teleport pairs from board tiles
     */
    initializeFromTiles(tiles: Tile[][]): void {
        this.teleportPairs = TeleportationDataHelper.extractTeleportPairsFromBoard(tiles);
    }

    /**
     * Get the color for a teleport pair ID
     */
    getPairColor(pairId: string | undefined): string {
        if (!pairId) return '#FFFFFF';
        const pair = this.teleportPairs.get(pairId);
        return pair?.color || '#FFFFFF';
    }

    /**
     * Get the pair number from pair ID
     */
    getPairNumber(pairId: string | undefined): string | null {
        if (!pairId) return null;
        return pairId.replace('tp-', '');
    }
}

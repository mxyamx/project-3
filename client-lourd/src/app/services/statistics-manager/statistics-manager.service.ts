import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { DATE_FORMAT_CONSTANTS, PERCENTAGE_CALCULATION } from '@app/constants/objects-constants';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { ItemType } from '@common/enums/item-type';
import { TileType } from '@common/enums/tile-type';
import { Item } from '@common/item';
import { Player } from '@common/player';
import { Position } from '@common/position';
import { GlobalStatistics, PlayerStatistics } from '@common/statistics';

@Injectable({
    providedIn: 'root',
})
export class StatisticsManagerService {
    displayedGlobalStatistics: WritableSignal<GlobalStatistics> = signal({
        startTime: 0,
        endTime: 0,
        gameDuration: '00:00',
        numberTurns: 0,
        tilePercentage: 0,
        doorPercentage: 0,
        flagsDetained: 0,
    });

    playerStatisticsMap = new Map<string, WritableSignal<PlayerStatistics>>();
    private boardGameManager: BoardGameManagerService = inject(BoardGameManagerService);

    private visitedTiles = new Set<string>();
    private handledDoors = new Set<string>();
    private visitedPlayerTiles = new Map<string, Set<string>>();
    private playerCollectedItems = new Map<string, Set<string>>();

    setStartTime(): void {
        this.displayedGlobalStatistics.update((stats) => ({
            ...stats,
            startTime: Date.now(),
            gameDuration: '00:00',
        }));
    }

    setEndTime(): void {
        this.displayedGlobalStatistics.update((stats) => {
            const endTime = Date.now();
            const durationMs = endTime - stats.startTime;
            const gameDuration = this.formatDuration(durationMs);

            return {
                ...stats,
                endTime,
                gameDuration,
            };
        });
    }

    updateNumberTurns(): void {
        this.displayedGlobalStatistics.update((stats) => {
            const numberTurns = stats.numberTurns + 1;
            return { ...stats, numberTurns };
        });
    }

    updateTilePercentage(position: Position): void {
        const tileCoord = `${position.x},${position.y}`;
        this.visitedTiles.add(tileCoord);

        const terrainTilesCount = this.getTerrainTilesCount();
        const percentage = Math.round((this.visitedTiles.size / terrainTilesCount) * PERCENTAGE_CALCULATION);
        this.displayedGlobalStatistics.update((stats) => ({
            ...stats,
            tilePercentage: percentage,
        }));
    }

    updateDoorPercentage(position: Position): void {
        const doorCoord = `${position.x},${position.y}`;
        this.handledDoors.add(doorCoord);

        const doorCount = this.getDoorCount();

        const percentage = Math.round((this.handledDoors.size / doorCount) * PERCENTAGE_CALCULATION);
        this.displayedGlobalStatistics.update((stats) => ({
            ...stats,
            doorPercentage: percentage,
        }));
    }

    reset(): void {
        this.displayedGlobalStatistics.set({
            startTime: 0,
            endTime: 0,
            gameDuration: '00:00',
            numberTurns: 0,
            tilePercentage: 0,
            doorPercentage: 0,
            flagsDetained: 0,
        });
        this.playerStatisticsMap.clear();
        this.visitedTiles.clear();
        this.handledDoors.clear();
        this.visitedPlayerTiles.clear();
        this.playerCollectedItems.clear();
    }

    initializePlayerStatistics(player: Player): void {
        this.playerStatisticsMap.set(
            player.name,
            signal({
                combatAmount: 0,
                escapeAmount: 0,
                victoryAmount: 0,
                defeatAmount: 0,
                lifePointsLost: 0,
                lifePointsOpponentLost: 0,
                itemsCollected: 0,
                tilePercentage: 0,
            }),
        );
    }

    updateCombatAmount(playerName: string): void {
        const statsSignal = this.playerStatisticsMap.get(playerName);
        if (statsSignal) {
            statsSignal.update((stats) => ({
                ...stats,
                combatAmount: stats.combatAmount + 1,
            }));
        }
    }

    updateEscapeAmount(playerName: string): void {
        const statsSignal = this.playerStatisticsMap.get(playerName);
        if (statsSignal) {
            statsSignal.update((stats) => ({
                ...stats,
                escapeAmount: stats.escapeAmount + 1,
            }));
        }
    }

    updateVictoryAmount(playerName: string): void {
        const statsSignal = this.playerStatisticsMap.get(playerName);
        if (statsSignal) {
            statsSignal.update((stats) => ({
                ...stats,
                victoryAmount: stats.victoryAmount + 1,
            }));
        }
    }

    updateDefeatAmount(playerName: string): void {
        const statsSignal = this.playerStatisticsMap.get(playerName);
        if (statsSignal) {
            statsSignal.update((stats) => ({
                ...stats,
                defeatAmount: stats.defeatAmount + 1,
            }));
        }
    }

    addLifePointsLost(playerName: string, points: number): void {
        const statsSignal = this.playerStatisticsMap.get(playerName);
        if (statsSignal) {
            statsSignal.update((stats) => ({
                ...stats,
                lifePointsLost: stats.lifePointsLost + points,
            }));
        }
    }

    addLifePointsOpponentLost(playerName: string, points: number): void {
        const statsSignal = this.playerStatisticsMap.get(playerName);
        if (statsSignal) {
            statsSignal.update((stats) => ({
                ...stats,
                lifePointsOpponentLost: stats.lifePointsOpponentLost + points,
            }));
        }
    }

    updateItemsCollected(playerName: string, item: Item): void {
        const statsSignal = this.playerStatisticsMap.get(playerName);
        let playerItems = this.playerCollectedItems.get(playerName);

        if (!playerItems) {
            playerItems = new Set<string>();
            this.playerCollectedItems.set(playerName, playerItems);
        }

        if (statsSignal) {
            if (!playerItems.has(item.name)) {
                playerItems.add(item.name);
                statsSignal.update((stats) => ({
                    ...stats,
                    itemsCollected: stats.itemsCollected + 1,
                }));
                if (item.type === ItemType.Flag) {
                    this.displayedGlobalStatistics.update((stats) => ({
                        ...stats,
                        flagsDetained: (stats.flagsDetained ?? 0) + 1,
                    }));
                }
            }
        }
    }

    updatePlayerTilePercentage(playerName: string, position: Position): void {
        const tileCoord = `${position.x},${position.y}`;
        let playerTiles = this.visitedPlayerTiles.get(playerName);
        if (!playerTiles) {
            playerTiles = new Set<string>();
            this.visitedPlayerTiles.set(playerName, playerTiles);
        }

        playerTiles.add(tileCoord);
        const terrainTilesCount = this.getTerrainTilesCount();
        const percentage = Math.round((playerTiles.size / terrainTilesCount) * PERCENTAGE_CALCULATION);
        const statsSignal = this.playerStatisticsMap.get(playerName);
        if (statsSignal) {
            statsSignal.update((stats) => ({
                ...stats,
                tilePercentage: percentage,
            }));
        }
    }

    private formatDuration(ms: number): string {
        const totalSeconds = Math.floor(ms / DATE_FORMAT_CONSTANTS.seconds);
        const minutes = Math.floor(totalSeconds / DATE_FORMAT_CONSTANTS.minutes);
        const seconds = totalSeconds % DATE_FORMAT_CONSTANTS.minutes;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    private getTerrainTilesCount(): number {
        const tiles = this.boardGameManager.playingBoardGame().tiles;
        let terrainTilesCount = 0;
        for (const row of tiles) {
            for (const tile of row) {
                if (tile.type !== TileType.Wall && tile.type !== TileType.Door) {
                    terrainTilesCount++;
                }
            }
        }
        return terrainTilesCount;
    }

    private getDoorCount(): number {
        const tiles = this.boardGameManager.playingBoardGame().tiles;
        let doorCount = 0;
        for (const row of tiles) {
            for (const tile of row) {
                if (tile.type === TileType.Door) {
                    doorCount++;
                }
            }
        }

        return doorCount;
    }
}

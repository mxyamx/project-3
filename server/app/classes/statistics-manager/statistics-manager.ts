import { DATE_FORMAT_CONSTANTS, PERCENTAGE_CALCULATION } from '@app/constants/development-constants';
import { ItemType } from '@common/enums/item-type';
import { TileType } from '@common/enums/tile-type';
import { Item } from '@common/item';
import { Player } from '@common/player';
import { Position } from '@common/position';
import { GlobalStatistics, PlayerStatistics } from '@common/statistics';
import { Tile } from '@common/tile';

export class StatisticsManager {
    displayedGlobalStatistics: GlobalStatistics = {
        startTime: 0,
        endTime: 0,
        gameDuration: '00:00',
        numberTurns: 0,
        tilePercentage: 0,
        doorPercentage: 0,
        flagsDetained: 0,
    };

    playerStatisticsMap = new Map<string, PlayerStatistics & { name: string }>();

    private visitedTiles = new Set<string>();
    private handledDoors = new Set<string>();
    private visitedPlayerTiles = new Map<string, Set<string>>();
    private playerCollectedItems = new Map<string, Set<string>>();
    private originalTiles: Tile[][] = [[]];

    constructor(tiles: Tile[][]) {
        this.originalTiles = structuredClone(tiles);
        this.reset();
    }

    setStartTime(): void {
        this.displayedGlobalStatistics = {
            ...this.displayedGlobalStatistics,
            startTime: Date.now(),
            gameDuration: '00:00',
        };
    }

    setEndTime(): void {
        const endTime = Date.now();
        const durationMs = endTime - this.displayedGlobalStatistics.startTime;
        const gameDuration = this.formatDuration(durationMs);

        this.displayedGlobalStatistics = {
            ...this.displayedGlobalStatistics,
            endTime,
            gameDuration,
        };
    }

    updateNumberTurns(): void {
        const numberTurns = this.displayedGlobalStatistics.numberTurns + 1;
        this.displayedGlobalStatistics = {
            ...this.displayedGlobalStatistics,
            numberTurns,
        };
    }

    updateTilePercentage(position: Position): void {
        const tileCoord = `${position.x},${position.y}`;
        this.visitedTiles.add(tileCoord);

        const terrainTilesCount = this.getTerrainTilesCount();
        const percentage = Math.round((this.visitedTiles.size / terrainTilesCount) * PERCENTAGE_CALCULATION);
        this.displayedGlobalStatistics = {
            ...this.displayedGlobalStatistics,
            tilePercentage: percentage,
        };
    }

    updateDoorPercentage(position: Position): void {
        const doorCoord = `${position.x},${position.y}`;
        this.handledDoors.add(doorCoord);

        const doorCount = this.getDoorCount();

        const percentage = Math.round((this.handledDoors.size / doorCount) * PERCENTAGE_CALCULATION);
        this.displayedGlobalStatistics = {
            ...this.displayedGlobalStatistics,
            doorPercentage: percentage,
        };
    }

    reset(): void {
        this.displayedGlobalStatistics = {
            startTime: 0,
            endTime: 0,
            gameDuration: '00:00',
            numberTurns: 0,
            tilePercentage: 0,
            doorPercentage: 0,
            flagsDetained: 0,
        };
        this.playerStatisticsMap.clear();
        this.visitedTiles.clear();
        this.handledDoors.clear();
        this.visitedPlayerTiles.clear();
        this.playerCollectedItems.clear();
    }

    initializePlayerStatistics(player: Player): void {
        this.playerStatisticsMap.set(player.userId, {
            name: player.name,
            combatAmount: 0,
            escapeAmount: 0,
            victoryAmount: 0,
            defeatAmount: 0,
            lifePointsLost: 0,
            lifePointsOpponentLost: 0,
            itemsCollected: 0,
            tilePercentage: 0,
        });
    }

    updateCombatAmount(playerUserId: string): void {
        let statsSignal: PlayerStatistics & { name: string } = this.playerStatisticsMap.get(playerUserId);
        if (statsSignal) {
            statsSignal = {
                ...statsSignal,
                combatAmount: statsSignal.combatAmount + 1,
            };
            this.playerStatisticsMap.set(playerUserId, statsSignal);
        }
    }

    updateEscapeAmount(playerUserId: string): void {
        let statsSignal: PlayerStatistics & { name: string } = this.playerStatisticsMap.get(playerUserId);
        if (statsSignal) {
            statsSignal = {
                ...statsSignal,
                escapeAmount: statsSignal.escapeAmount + 1,
            };
            this.playerStatisticsMap.set(playerUserId, statsSignal);
        }
    }

    updateVictoryAmount(playerUserId: string): void {
        let statsSignal: PlayerStatistics & { name: string } = this.playerStatisticsMap.get(playerUserId);
        if (statsSignal) {
            statsSignal = {
                ...statsSignal,
                victoryAmount: statsSignal.victoryAmount + 1,
            };
            this.playerStatisticsMap.set(playerUserId, statsSignal);
        }
    }
    getVictoryAmount(playerUserId: string): number {
        const statsSignal: PlayerStatistics & { name: string } = this.playerStatisticsMap.get(playerUserId);
        if (statsSignal) {
            return statsSignal.victoryAmount;
        }
        return 0;
    }

    updateDefeatAmount(playerUserId: string): void {
        let statsSignal: PlayerStatistics & { name: string } = this.playerStatisticsMap.get(playerUserId);
        if (statsSignal) {
            statsSignal = {
                ...statsSignal,
                defeatAmount: statsSignal.defeatAmount + 1,
            };
            this.playerStatisticsMap.set(playerUserId, statsSignal);
        }
    }

    addLifePointsLost(playerUserId: string, points: number): void {
        let statsSignal: PlayerStatistics & { name: string } = this.playerStatisticsMap.get(playerUserId);
        if (statsSignal) {
            statsSignal = {
                ...statsSignal,
                lifePointsLost: statsSignal.lifePointsLost + points,
            };
            this.playerStatisticsMap.set(playerUserId, statsSignal);
        }
    }

    addLifePointsOpponentLost(playerUserId: string, points: number): void {
        let statsSignal: PlayerStatistics & { name: string } = this.playerStatisticsMap.get(playerUserId);
        if (statsSignal) {
            statsSignal = {
                ...statsSignal,
                lifePointsOpponentLost: statsSignal.lifePointsOpponentLost + points,
            };
            this.playerStatisticsMap.set(playerUserId, statsSignal);
        }
    }

    updateItemsCollected(playerUserId: string, item: Item): void {
        let statsSignal: PlayerStatistics & { name: string } = this.playerStatisticsMap.get(playerUserId);
        let playerItems = this.playerCollectedItems.get(playerUserId);

        if (!playerItems) {
            playerItems = new Set<string>();
            this.playerCollectedItems.set(playerUserId, playerItems);
        }

        if (statsSignal) {
            if (!playerItems.has(item.name)) {
                playerItems.add(item.name);
                statsSignal = {
                    ...statsSignal,
                    itemsCollected: statsSignal.itemsCollected + 1,
                };
                this.playerStatisticsMap.set(playerUserId, statsSignal);
                if (item.type === ItemType.Flag) {
                    this.displayedGlobalStatistics = {
                        ...this.displayedGlobalStatistics,
                        flagsDetained: (this.displayedGlobalStatistics.flagsDetained ?? 0) + 1,
                    };
                }
            }
        }
    }

    updatePlayerTilePercentage(playerUserId: string, position: Position): void {
        const tileCoord = `${position.x},${position.y}`;
        let playerTiles = this.visitedPlayerTiles.get(playerUserId);
        if (!playerTiles) {
            playerTiles = new Set<string>();
            this.visitedPlayerTiles.set(playerUserId, playerTiles);
        }

        playerTiles.add(tileCoord);
        const terrainTilesCount = this.getTerrainTilesCount();
        const percentage = Math.round((playerTiles.size / terrainTilesCount) * PERCENTAGE_CALCULATION);
        let statsSignal = this.playerStatisticsMap.get(playerUserId);
        if (statsSignal) {
            statsSignal = {
                ...statsSignal,
                tilePercentage: percentage,
            };
            this.playerStatisticsMap.set(playerUserId, statsSignal);
        }
    }

    private formatDuration(ms: number): string {
        const totalSeconds = Math.floor(ms / DATE_FORMAT_CONSTANTS.seconds);
        const minutes = Math.floor(totalSeconds / DATE_FORMAT_CONSTANTS.minutes);
        const seconds = totalSeconds % DATE_FORMAT_CONSTANTS.minutes;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    private getTerrainTilesCount(): number {
        let terrainTilesCount = 0;
        for (const row of this.originalTiles) {
            for (const tile of row) {
                if (tile.type !== TileType.Wall && tile.type !== TileType.Door) {
                    terrainTilesCount++;
                }
            }
        }
        return terrainTilesCount;
    }

    private getDoorCount(): number {
        let doorCount = 0;
        for (const row of this.originalTiles) {
            for (const tile of row) {
                if (tile.type === TileType.Door) {
                    doorCount++;
                }
            }
        }

        return doorCount;
    }
}

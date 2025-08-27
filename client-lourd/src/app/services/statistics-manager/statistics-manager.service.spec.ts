/* eslint-disable @typescript-eslint/no-magic-numbers */
import { TestBed } from '@angular/core/testing';
import { STANDARD_ITEM, STANDARD_PLAYERS } from '@app/constants/development-constants';
import { PERCENTAGE_CALCULATION } from '@app/constants/objects-constants';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { BoardGame } from '@common/board-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { GameMode } from '@common/enums/game-mode';
import { ItemType } from '@common/enums/item-type';
import { TileType } from '@common/enums/tile-type';
import { Position } from '@common/position';
import { StatisticsManagerService } from './statistics-manager.service';

describe('StatisticsManagerService', () => {
    let service: StatisticsManagerService;
    let testBoard: BoardGame;
    let boardGameManagerSpy: jasmine.SpyObj<BoardGameManagerService>;

    beforeEach(() => {
        boardGameManagerSpy = jasmine.createSpyObj('BoardGameManagerService', ['playingBoardGame']);

        const rows = 10;
        const cols = 10;

        testBoard = {
            id: 'validBoard',
            name: 'Valid Board',
            description: 'A test board',
            size: BoardGameSize.Small,
            gameMode: GameMode.Normal,
            tiles: Array(rows)
                .fill(null)
                .map(() =>
                    Array(cols)
                        .fill(null)
                        .map(() => ({ type: TileType.Grass })),
                ),
            previewImage: 'valid-image-url',
            visibility: true,
            itemInfos: [
                {
                    item: {
                        name: 'Entry Point',
                        type: ItemType.StartingPoint,
                        description: 'Starting point for the game',
                    },
                    available: 0,
                },
            ],
            lastModified: new Date(),
        };

        boardGameManagerSpy.playingBoardGame.and.returnValue(testBoard);

        TestBed.configureTestingModule({
            providers: [{ provide: BoardGameManagerService, useValue: boardGameManagerSpy }],
        });
        service = TestBed.inject(StatisticsManagerService);
        service.initializePlayerStatistics(STANDARD_PLAYERS[0]);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should initialize player statistics', () => {
        expect(service.playerStatisticsMap.has(STANDARD_PLAYERS[0].name)).toBeTrue();
        const stats = service.playerStatisticsMap.get(STANDARD_PLAYERS[0].name)?.();
        expect(stats).toEqual({
            combatAmount: 0,
            escapeAmount: 0,
            victoryAmount: 0,
            defeatAmount: 0,
            lifePointsLost: 0,
            lifePointsOpponentLost: 0,
            itemsCollected: 0,
            tilePercentage: 0,
        });
    });

    it('should update the combat amount', () => {
        service.updateCombatAmount(STANDARD_PLAYERS[0].name);
        const stats = service.playerStatisticsMap.get(STANDARD_PLAYERS[0].name)?.();
        expect(stats?.combatAmount).toBe(1);
    });

    it('should update the escape amount', () => {
        service.updateEscapeAmount(STANDARD_PLAYERS[0].name);
        const stats = service.playerStatisticsMap.get(STANDARD_PLAYERS[0].name)?.();
        expect(stats?.escapeAmount).toBe(1);
    });

    it('should update the victory amount', () => {
        service.updateVictoryAmount(STANDARD_PLAYERS[0].name);
        const stats = service.playerStatisticsMap.get(STANDARD_PLAYERS[0].name)?.();
        expect(stats?.victoryAmount).toBe(1);
    });

    it('should update the defeat amount', () => {
        service.updateDefeatAmount(STANDARD_PLAYERS[0].name);
        const stats = service.playerStatisticsMap.get(STANDARD_PLAYERS[0].name)?.();
        expect(stats?.defeatAmount).toBe(1);
    });

    it('should add life the points lost', () => {
        service.addLifePointsLost(STANDARD_PLAYERS[0].name, 5);
        const stats = service.playerStatisticsMap.get(STANDARD_PLAYERS[0].name)?.();
        expect(stats?.lifePointsLost).toBe(5);
    });

    it('should add life the points opponent lost', () => {
        service.addLifePointsOpponentLost(STANDARD_PLAYERS[0].name, 3);
        const stats = service.playerStatisticsMap.get(STANDARD_PLAYERS[0].name)?.();
        expect(stats?.lifePointsOpponentLost).toBe(3);
    });

    it('should update the player tile percentage', () => {
        const position: Position = { x: 1, y: 1 };
        service.updatePlayerTilePercentage(STANDARD_PLAYERS[0].name, position);
        const stats = service.playerStatisticsMap.get(STANDARD_PLAYERS[0].name)?.();
        expect(stats?.tilePercentage).toBe(1);
    });

    it('should calculate correct percentage of visited tiles', () => {
        testBoard.tiles = [
            [{ type: TileType.Grass }, { type: TileType.Wall }],
            [{ type: TileType.Grass }, { type: TileType.Door }],
        ];
        const position1: Position = { x: 0, y: 0 };
        const position2: Position = { x: 1, y: 0 };
        service.updateTilePercentage(position1);

        expect(service['displayedGlobalStatistics']().tilePercentage).toBe(Math.round((1 / 2) * PERCENTAGE_CALCULATION));

        service.updateTilePercentage(position2);

        expect(service['displayedGlobalStatistics']().tilePercentage).toBe(Math.round((2 / 2) * PERCENTAGE_CALCULATION));
    });

    it('should update the items collected for new items', () => {
        service.updateItemsCollected(STANDARD_PLAYERS[0].name, STANDARD_ITEM);
        const stats = service.playerStatisticsMap.get(STANDARD_PLAYERS[0].name)?.();
        expect(stats?.itemsCollected).toBe(1);
    });

    it('should initialize flagsDetained to 0 if its undefined in global stats during flag collection', () => {
        service.displayedGlobalStatistics.update((stats) => ({ ...stats, flagsDetained: undefined }));

        service.updateItemsCollected(STANDARD_PLAYERS[0].name, STANDARD_ITEM);

        const globalStats = service.displayedGlobalStatistics();
        expect(globalStats.flagsDetained).toBe(1);
    });

    it('should count door tiles correctly', () => {
        const testBoardWithDoors: BoardGame = {
            ...testBoard,
            tiles: [[{ type: TileType.Door }]],
        };
        boardGameManagerSpy.playingBoardGame.and.returnValue(testBoardWithDoors);

        service.updateDoorPercentage({ x: 0, y: 0 });

        const globalStats = service.displayedGlobalStatistics();
        expect(globalStats.doorPercentage).toBe(100);
    });

    it('should update the global tile percentage', () => {
        const position: Position = { x: 1, y: 1 };
        service.updateTilePercentage(position);
        const stats = service.displayedGlobalStatistics();
        expect(stats?.tilePercentage).toBe(1);
    });
});

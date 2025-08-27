import { TestBed } from '@angular/core/testing';

import { BoardGameGraph } from '@app/classes/board-game-graph/board-game-graph';
import { STANDARD_PLAYER } from '@app/constants/development-constants';
import { DEFAULT_BOARD } from '@app/constants/objects-constants';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { CanvasManagerService } from '@app/services/canvas-manager/canvas-manager.service';
import { BoardGame } from '@common/board-game';
import { PlayerState } from '@common/enums/player-state';
import { TileType } from '@common/enums/tile-type';
import { Player } from '@common/player';
import { Tile } from '@common/tile';
import { PlayerStateManagerService } from './player-state-manager.service';

describe('PlayerStateManagerService', () => {
    let service: PlayerStateManagerService;
    let canvasManagerSpy: jasmine.SpyObj<CanvasManagerService>;
    let boardGameManagerSpy: jasmine.SpyObj<BoardGameManagerService>;
    let standardBoard: BoardGame;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let resetTilesDistances: any;
    let tileSetTest: Tile[][];

    beforeEach(() => {
        boardGameManagerSpy = jasmine.createSpyObj('BoardGameManager', ['playingBoardGame', 'updateTiles']);
        canvasManagerSpy = jasmine.createSpyObj('CanvasManagerService', ['clearCanvas']);
        standardBoard = DEFAULT_BOARD;
        tileSetTest = [
            [{ type: TileType.Grass }, { type: TileType.Grass }, { type: TileType.Grass }],
            [{ type: TileType.Grass, containedPlayer: STANDARD_PLAYER }, { type: TileType.Grass }, { type: TileType.Grass, doorState: true }],
            [{ type: TileType.Grass }, { type: TileType.Grass, doorState: false }, { type: TileType.Grass }],
        ];
        standardBoard.tiles = tileSetTest;
        TestBed.configureTestingModule({
            providers: [
                PlayerStateManagerService,
                { provide: BoardGameManagerService, useValue: boardGameManagerSpy },
                { provide: CanvasManagerService, useValue: canvasManagerSpy },
            ],
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (boardGameManagerSpy as any).playingBoardGame = () => standardBoard;

        resetTilesDistances = () => {
            const newTiles: Tile[][] = boardGameManagerSpy.playingBoardGame().tiles;

            for (const row of newTiles) {
                for (const tile of row) {
                    tile.reachable = false;
                    tile.shortestDistanceFromPosition = [];
                }
            }
        };
        service = TestBed.inject(PlayerStateManagerService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should switch to waiting for action properly', () => {
        const player: Player = STANDARD_PLAYER;
        player.position = { x: 0, y: 0 };
        const tiles = structuredClone(standardBoard.tiles);
        const graph = new BoardGameGraph(tiles);
        const reachableNodes = graph.findReachableNodes(player.position, player.attributes.speedValue);

        for (const reachableNode of reachableNodes) {
            tiles[reachableNode.tilePosition.x][reachableNode.tilePosition.y].reachable = true;
        }

        service.changeState(PlayerState.WaitingForAction, player);
        expect(boardGameManagerSpy.updateTiles).toHaveBeenCalledWith(tiles, true);
        expect(canvasManagerSpy.clearCanvas).toHaveBeenCalled();
        expect(service.playerState()).toEqual(PlayerState.WaitingForAction);
    });

    it('should call findReachableNodes with default position {x: 0, y: 0} if chosenPlayer position is undefined', () => {
        const newTiles: Tile[][] = structuredClone(standardBoard.tiles);
        for (const row of newTiles) {
            for (const tile of row) {
                tile.reachable = false;
            }
        }

        spyOn(BoardGameGraph.prototype, 'findReachableNodes').and.returnValue([]);

        const player: Player = { ...STANDARD_PLAYER, position: undefined };

        service.changeState(PlayerState.WaitingForAction, player);

        expect(BoardGameGraph.prototype.findReachableNodes).toHaveBeenCalledWith({ x: 0, y: 0 }, player.attributes.speedValue);
    });

    it('should switch to waiting for turn properly', () => {
        const newTiles: Tile[][] = structuredClone(standardBoard.tiles);
        for (const row of newTiles) {
            for (const tile of row) {
                tile.reachable = false;
            }
        }
        const player: Player = STANDARD_PLAYER;
        service.changeState(PlayerState.WaitingForTurn, player);

        expect(boardGameManagerSpy.updateTiles).toHaveBeenCalledWith(newTiles, true);
        expect(service.playerState()).toEqual(PlayerState.WaitingForTurn);
        expect(canvasManagerSpy.clearCanvas).toHaveBeenCalled();
    });
    it('should switch to moving properly', () => {
        service.changeState(PlayerState.Moving, STANDARD_PLAYER);
        resetTilesDistances();
        expect(boardGameManagerSpy.updateTiles).toHaveBeenCalledWith(standardBoard.tiles, true);
        expect(service.playerState()).toEqual(PlayerState.Moving);
        expect(canvasManagerSpy.clearCanvas).toHaveBeenCalled();
    });
    it('should switch to spectatingFight properly', () => {
        service.changeState(PlayerState.SpectatingFight, STANDARD_PLAYER);
        resetTilesDistances();
        expect(boardGameManagerSpy.updateTiles).toHaveBeenCalledWith(standardBoard.tiles, true);
        expect(service.playerState()).toEqual(PlayerState.SpectatingFight);
        expect(canvasManagerSpy.clearCanvas).toHaveBeenCalled();
    });
    it('should switch to attacking properly', () => {
        service.changeState(PlayerState.Attacking, STANDARD_PLAYER);
        resetTilesDistances();
        expect(boardGameManagerSpy.updateTiles).toHaveBeenCalledWith(standardBoard.tiles, true);
        expect(service.playerState()).toEqual(PlayerState.Attacking);
        expect(canvasManagerSpy.clearCanvas).toHaveBeenCalled();
    });
    it('should switch to droppingItem properly', () => {
        service.changeState(PlayerState.DroppingItem, STANDARD_PLAYER);
        resetTilesDistances();
        expect(boardGameManagerSpy.updateTiles).toHaveBeenCalledWith(standardBoard.tiles, true);
        expect(service.playerState()).toEqual(PlayerState.DroppingItem);
        expect(canvasManagerSpy.clearCanvas).toHaveBeenCalled();
    });

    it('should switch to defending properly', () => {
        service.changeState(PlayerState.Defending, STANDARD_PLAYER);
        resetTilesDistances();
        expect(boardGameManagerSpy.updateTiles).toHaveBeenCalledWith(standardBoard.tiles, true);
        expect(service.playerState()).toEqual(PlayerState.Defending);
        expect(canvasManagerSpy.clearCanvas).toHaveBeenCalled();
    });

    it('should switch to transitioning properly', () => {
        service.changeState(PlayerState.Transitioning, STANDARD_PLAYER);
        resetTilesDistances();
        expect(boardGameManagerSpy.updateTiles).toHaveBeenCalledWith(standardBoard.tiles, true);
        expect(service.playerState()).toEqual(PlayerState.Transitioning);
        expect(canvasManagerSpy.clearCanvas).toHaveBeenCalled();
    });

    it('should switch to endGame properly', () => {
        service.changeState(PlayerState.EndGame, STANDARD_PLAYER);
        resetTilesDistances();
        expect(boardGameManagerSpy.updateTiles).toHaveBeenCalledWith(standardBoard.tiles, true);
        expect(service.playerState()).toEqual(PlayerState.EndGame);
        expect(canvasManagerSpy.clearCanvas).toHaveBeenCalled();
    });
    it('should switch to default properly', () => {
        service.changeState('default' as PlayerState, STANDARD_PLAYER);
        resetTilesDistances();
        expect(boardGameManagerSpy.updateTiles).toHaveBeenCalledWith(standardBoard.tiles, true);
        expect(service.playerState()).toEqual(PlayerState.WaitingForTurn);
        expect(canvasManagerSpy.clearCanvas).toHaveBeenCalled();
    });

    it('should switch to Teleporting properly', () => {
        service.changeState(PlayerState.Teleporting, STANDARD_PLAYER);
        resetTilesDistances();
        expect(boardGameManagerSpy.updateTiles).toHaveBeenCalledWith(standardBoard.tiles, true);
        expect(service.playerState()).toEqual(PlayerState.Teleporting);
        expect(canvasManagerSpy.clearCanvas).toHaveBeenCalled();
    });

    it('should switch to picking item properly', () => {
        service.changeState(PlayerState.PickingItem, STANDARD_PLAYER);
        resetTilesDistances();
        expect(boardGameManagerSpy.updateTiles).toHaveBeenCalledWith(standardBoard.tiles, true);
        expect(service.playerState()).toEqual(PlayerState.PickingItem);
        expect(canvasManagerSpy.clearCanvas).toHaveBeenCalled();
    });

    it('should switch to opening door properly', () => {
        service.changeState(PlayerState.OpeningDoor, STANDARD_PLAYER);
        resetTilesDistances();
        expect(boardGameManagerSpy.updateTiles).toHaveBeenCalledWith(standardBoard.tiles, true);
        expect(service.playerState()).toEqual(PlayerState.OpeningDoor);
        expect(canvasManagerSpy.clearCanvas).toHaveBeenCalled();
    });

    it('should call findReachableNodes with default position {x: 0, y: 0} if chosenPlayer position is undefined', () => {
        const newTiles: Tile[][] = structuredClone(standardBoard.tiles);
        for (const row of newTiles) {
            for (const tile of row) {
                tile.reachable = false;
            }
        }

        spyOn(BoardGameGraph.prototype, 'findReachableNodes').and.returnValue([]);

        const player: Player = { ...STANDARD_PLAYER, position: undefined };

        service.changeState(PlayerState.WaitingForAction, player);

        expect(BoardGameGraph.prototype.findReachableNodes).toHaveBeenCalledWith({ x: 0, y: 0 }, player.attributes.speedValue);
    });
});

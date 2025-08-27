import { TestBed } from '@angular/core/testing';

import { STANDARD_PLAYER, STANDARD_PLAYERS } from '@app/constants/development-constants';
import { DEFAULT_BOARD } from '@app/constants/objects-constants';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { BoardGame } from '@common/board-game';
import { ActionType } from '@common/enums/action-type';
import { CtfTeam } from '@common/enums/ctf-team';
import { GameMode } from '@common/enums/game-mode';
import { TileType } from '@common/enums/tile-type';
import { Player } from '@common/player';
import { Tile } from '@common/tile';
import { ActionDetectorService } from './action-detector.service';

describe('ActionDetectorService', () => {
    let service: ActionDetectorService;
    let boardGameManagerSpy: jasmine.SpyObj<BoardGameManagerService>;
    let standardBoard: BoardGame;
    let tileSetTest: Tile[][];

    beforeEach(() => {
        boardGameManagerSpy = jasmine.createSpyObj('BoardGameManagerService', ['playingBoardGame', 'updateTiles']);
        standardBoard = DEFAULT_BOARD;

        TestBed.configureTestingModule({ providers: [ActionDetectorService, { provide: BoardGameManagerService, useValue: boardGameManagerSpy }] });
        service = TestBed.inject(ActionDetectorService);

        tileSetTest = [
            [{ type: TileType.Grass }, { type: TileType.Grass }, { type: TileType.Grass }],
            [{ type: TileType.Grass, containedPlayer: STANDARD_PLAYER }, { type: TileType.Grass }, { type: TileType.Door, doorState: true }],
            [{ type: TileType.Grass }, { type: TileType.Door, doorState: false }, { type: TileType.Grass }],
        ];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (boardGameManagerSpy as any).playingBoardGame = () => {
            return standardBoard;
        };
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should detect actions correctly', () => {
        standardBoard.tiles = tileSetTest;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (standardBoard as any).size = 3;

        const player: Player = STANDARD_PLAYER;
        player.position = { x: 1, y: 1 };
        service.setActionStatus(player);

        expect(tileSetTest[0][0].availableAction).toBeFalsy();

        expect(tileSetTest[0][1].availableAction).toBeFalsy();

        expect(tileSetTest[0][2].availableAction).toBeFalsy();

        expect(tileSetTest[1][0].availableAction?.type).toEqual(ActionType.AttackPlayer);
        expect(tileSetTest[1][0].availableAction?.target).toEqual({ x: 1, y: 0 });

        expect(tileSetTest[1][1].availableAction).toBeFalsy();

        expect(tileSetTest[1][2].availableAction?.type).toEqual(ActionType.CloseDoor);
        expect(tileSetTest[1][2].availableAction?.target).toEqual({ x: 1, y: 2 });

        expect(tileSetTest[2][0].availableAction).toBeFalsy();

        expect(tileSetTest[2][1].availableAction?.type).toEqual(ActionType.OpenDoor);
        expect(tileSetTest[2][1].availableAction?.target).toEqual({ x: 2, y: 1 });

        expect(tileSetTest[2][2].availableAction).toBeFalsy();
    });

    it('should detect correctly if there is an action available', () => {
        standardBoard.tiles = tileSetTest;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (standardBoard as any).size = 3;

        let player: Player = STANDARD_PLAYER;
        player.position = { x: 1, y: 1 };
        service.setActionStatus(player);

        let result: boolean = service.checkAvailableAction(player);

        expect(result).toBeTrue();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tileSetTest = [
            [{ type: TileType.Grass }, { type: TileType.Grass }, { type: TileType.Grass }],
            [{ type: TileType.Grass }, { type: TileType.Grass }, { type: TileType.Grass }],
            [{ type: TileType.Grass }, { type: TileType.Grass }, { type: TileType.Grass }],
        ];
        standardBoard.tiles = tileSetTest;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (standardBoard as any).size = 3;

        player = STANDARD_PLAYER;
        player.position = { x: 1, y: 1 };
        service.setActionStatus(player);

        result = service.checkAvailableAction(player);

        expect(result).toBeFalse();
    });

    it('should getNeighbors been called with {x: 0, y :0 } if chosenPlayer has an undefined position', () => {
        standardBoard.tiles = tileSetTest;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (standardBoard as any).size = 3;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const positionAttack: any = undefined;
        tileSetTest = [
            [
                {
                    containedPlayer: STANDARD_PLAYERS[1],
                    type: TileType.Grass,
                    availableAction: { type: ActionType.AttackPlayer, target: positionAttack, description: 'Attaquer le joueur' },
                },
                { type: TileType.Grass },
                { type: TileType.Grass },
            ],
            [{ type: TileType.Grass, containedPlayer: STANDARD_PLAYER }, { type: TileType.Grass }, { type: TileType.Grass, doorState: true }],
            [{ type: TileType.Grass }, { type: TileType.Grass, doorState: false }, { type: TileType.Grass }],
        ];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        spyOn<any>(service, 'getNeighbors').and.returnValue(tileSetTest[0]);

        const player: Player = STANDARD_PLAYER;
        player.position = undefined;
        service.checkAvailableAction(player);

        expect(service['getNeighbors']).toHaveBeenCalledWith({ x: 0, y: 0 });
    });

    it('should activate actions correctly', () => {
        service.actionActivated.set(false);
        service.activateAction();
        expect(service.actionActivated()).toBeTrue();
    });

    it('should deactivate actions correctly', () => {
        standardBoard.tiles = tileSetTest;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (standardBoard as any).size = 3;

        const player: Player = STANDARD_PLAYER;
        player.position = { x: 1, y: 1 };
        service.setActionStatus(player);

        service.actionActivated.set(true);

        service.deactivateAction();

        tileSetTest = tileSetTest = [
            [
                { type: TileType.Grass, availableAction: undefined },
                { type: TileType.Grass, availableAction: undefined, position: { x: 0, y: 1 } },
                { type: TileType.Grass, availableAction: undefined },
            ],
            [
                { type: TileType.Grass, containedPlayer: STANDARD_PLAYER, availableAction: undefined, position: { x: 1, y: 0 } },
                { type: TileType.Grass, availableAction: undefined },
                { type: TileType.Door, doorState: true, availableAction: undefined, position: { x: 1, y: 2 } },
            ],
            [
                { type: TileType.Grass, availableAction: undefined },
                { type: TileType.Door, doorState: false, availableAction: undefined, position: { x: 2, y: 1 } },
                { type: TileType.Grass, availableAction: undefined },
            ],
        ];
        expect(boardGameManagerSpy.updateTiles).toHaveBeenCalledWith(tileSetTest, true);
        expect(service.actionActivated()).toBeFalse();
    });

    it('should have {x: 0, y :0 } as default target position', () => {
        standardBoard.tiles = tileSetTest;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (standardBoard as any).size = 3;

        tileSetTest = [
            [{ type: TileType.Grass }, { type: TileType.Grass }, { type: TileType.Grass }],
            [{ type: TileType.Grass, containedPlayer: STANDARD_PLAYER }, { type: TileType.Grass }, { type: TileType.Grass, doorState: true }],
            [{ type: TileType.Grass }, { type: TileType.Grass, doorState: false }, { type: TileType.Grass }],
        ];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        spyOn<any>(service, 'getNeighbors').and.returnValue(tileSetTest[0]);

        const player: Player = STANDARD_PLAYER;
        player.position = undefined;
        service.setActionStatus(player);

        expect(tileSetTest[0][0].availableAction).toBeFalsy();
        expect(tileSetTest[0][1].availableAction).toBeFalsy();
        expect(tileSetTest[0][2].availableAction).toBeFalsy();
        expect(tileSetTest[1][1].availableAction).toBeFalsy();
        expect(tileSetTest[2][0].availableAction).toBeFalsy();
        expect(tileSetTest[2][2].availableAction).toBeFalsy();
    });

    it('should have {x: 0, y :0 } if attacking on an undefined position', () => {
        standardBoard.tiles = tileSetTest;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (standardBoard as any).size = 3;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const positionAttack: any = undefined;
        tileSetTest = [
            [
                {
                    containedPlayer: STANDARD_PLAYERS[1],
                    type: TileType.Grass,
                    availableAction: { type: ActionType.AttackPlayer, target: positionAttack, description: 'Attaquer le joueur' },
                },
                { type: TileType.Grass },
                { type: TileType.Grass },
            ],
            [{ type: TileType.Grass, containedPlayer: STANDARD_PLAYER }, { type: TileType.Grass }, { type: TileType.Grass, doorState: true }],
            [{ type: TileType.Grass }, { type: TileType.Grass, doorState: false }, { type: TileType.Grass }],
        ];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        spyOn<any>(service, 'getNeighbors').and.returnValue(tileSetTest[0]);

        const player: Player = STANDARD_PLAYER;
        // player.position = undefined;
        service.setActionStatus(player);

        expect(tileSetTest[0][0].availableAction?.target).toEqual({ x: 0, y: 0 });
    });

    it('should have {x: 0, y :0 } if closing a door on an undefined position', () => {
        standardBoard.tiles = tileSetTest;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (standardBoard as any).size = 3;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const position: any = undefined;
        tileSetTest = [
            [
                {
                    doorState: true,
                    type: TileType.Door,
                    availableAction: { type: ActionType.CloseDoor, target: position, description: 'Fermer la porte' },
                },
                { type: TileType.Grass },
                { type: TileType.Grass },
            ],
            [{ type: TileType.Grass, containedPlayer: STANDARD_PLAYER }, { type: TileType.Grass }, { type: TileType.Grass, doorState: true }],
            [{ type: TileType.Grass }, { type: TileType.Grass, doorState: false }, { type: TileType.Grass }],
        ];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        spyOn<any>(service, 'getNeighbors').and.returnValue(tileSetTest[0]);

        const player: Player = STANDARD_PLAYER;
        // player.position = undefined;
        service.setActionStatus(player);

        expect(tileSetTest[0][0].availableAction?.target).toEqual({ x: 0, y: 0 });
    });

    it('should have {x: 0, y :0 } if opening a door on an undefined position', () => {
        standardBoard.tiles = tileSetTest;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (standardBoard as any).size = 3;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const position: any = undefined;
        tileSetTest = [
            [
                {
                    type: TileType.Door,
                    doorState: false,
                    availableAction: { type: ActionType.OpenDoor, target: position, description: 'Ouvrir la porte' },
                },
                { type: TileType.Grass },
                { type: TileType.Grass },
            ],
            [{ type: TileType.Grass, containedPlayer: STANDARD_PLAYER }, { type: TileType.Grass }, { type: TileType.Grass, doorState: true }],
            [{ type: TileType.Grass }, { type: TileType.Grass, doorState: false }, { type: TileType.Grass }],
        ];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        spyOn<any>(service, 'getNeighbors').and.returnValue(tileSetTest[0]);

        const player: Player = STANDARD_PLAYER;
        // player.position = undefined;
        service.setActionStatus(player);

        expect(tileSetTest[0][0].availableAction?.target).toEqual({ x: 0, y: 0 });
    });

    it('should allow attacking if game mode is not CTF (teams do not matter)', () => {
        standardBoard.gameMode = GameMode.Normal;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (standardBoard as any).size = 3;
        standardBoard.tiles = tileSetTest;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (boardGameManagerSpy as any).playingBoardGame = () => {
            return standardBoard;
        };
        const enemyPlayer: Player = { ...STANDARD_PLAYERS[1], position: { x: 0, y: 1 } };
        standardBoard.tiles[0][1].containedPlayer = enemyPlayer;
        const mainPlayer: Player = { ...STANDARD_PLAYER, position: { x: 0, y: 0 } };
        service.setActionStatus(mainPlayer);
        expect(standardBoard.tiles[0][1].availableAction?.type).toBe(ActionType.AttackPlayer);
    });

    it('should NOT allow attacking if players are on the same team (CTF mode)', () => {
        standardBoard.gameMode = GameMode.CTF;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (standardBoard as any).size = 3;
        standardBoard.tiles = tileSetTest;
        const mainPlayer: Player = { ...STANDARD_PLAYER, position: { x: 0, y: 0 }, ctfTeam: CtfTeam.FirstTeam };
        const teammate: Player = { ...STANDARD_PLAYERS[1], position: { x: 0, y: 1 }, ctfTeam: CtfTeam.FirstTeam };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (boardGameManagerSpy as any).playingBoardGame = () => {
            return standardBoard;
        };
        standardBoard.tiles[0][1].containedPlayer = teammate;
        service.setActionStatus(mainPlayer);
        expect(standardBoard.tiles[0][1].availableAction).toBeUndefined();
    });

    it('should return false when not in CTF mode', () => {
        standardBoard.gameMode = GameMode.Normal;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (standardBoard as any).size = 3;
        standardBoard.tiles = tileSetTest;
        const player1: Player = { ...STANDARD_PLAYER, position: { x: 0, y: 0 }, ctfTeam: CtfTeam.FirstTeam };
        const player2: Player = { ...STANDARD_PLAYERS[1], position: { x: 0, y: 1 }, ctfTeam: CtfTeam.FirstTeam };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (service as any).areInSameTeam(player1, player2);
        expect(result).toBeFalse();
    });

    it('should return false when players are in different teams', () => {
        standardBoard.gameMode = GameMode.CTF;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (standardBoard as any).size = 3;
        standardBoard.tiles = tileSetTest;
        const player1: Player = { ...STANDARD_PLAYER, position: { x: 0, y: 0 }, ctfTeam: CtfTeam.FirstTeam };
        const player2: Player = { ...STANDARD_PLAYERS[1], position: { x: 0, y: 1 }, ctfTeam: CtfTeam.SecondTeam };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (service as any).areInSameTeam(player1, player2);
        expect(result).toBeFalse();
    });

    it('should return true when players are in same team', () => {
        standardBoard.gameMode = GameMode.CTF;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (standardBoard as any).size = 3;
        standardBoard.tiles = tileSetTest;
        const player1: Player = { ...STANDARD_PLAYER, position: { x: 0, y: 0 }, ctfTeam: CtfTeam.FirstTeam };
        const player2: Player = { ...STANDARD_PLAYERS[1], position: { x: 0, y: 1 }, ctfTeam: CtfTeam.FirstTeam };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (service as any).areInSameTeam(player1, player2);
        expect(result).toBeTrue();
    });
});

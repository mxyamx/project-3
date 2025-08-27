/* eslint-disable max-lines */
import { TestBed } from '@angular/core/testing';
import { SocketTestHelper } from '@app/classes/socket-test-helper/socket-test-helper';
import { STANDARD_LIST_PLAYERS, STANDARD_PLAYER } from '@app/constants/development-constants';
import { FROM_ITEM_NAME_TO_DESCRIPTION, ITEM_NAMES } from '@app/constants/objects-constants';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { GameEventService } from '@app/services/game-event/game-event.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { StatisticsManagerService } from '@app/services/statistics-manager/statistics-manager.service';
import { BoardGame } from '@common/board-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { GameMode } from '@common/enums/game-mode';
import { ItemType } from '@common/enums/item-type';
import { PlayerState } from '@common/enums/player-state';
import { SocketClientEventNames } from '@common/enums/socket-events-names';
import { TileType } from '@common/enums/tile-type';
import { Player } from '@common/player';
import { Position } from '@common/position';
import * as dataForm from '@common/socket-data-forms';
import { Socket } from 'socket.io-client';
import { MovementEventsHandlerService } from './movement-events-handler.service';

class SocketClientServiceMock extends SocketClientService {
    override connect() {
        return;
    }
}

const dummyPos: Position = { x: 0, y: 0 };

describe('MovementEventsHandlerService', () => {
    let service: MovementEventsHandlerService;
    let socketServiceMock: SocketClientServiceMock;
    let socketHelper: SocketTestHelper;
    let gameSessionManagerSpy: jasmine.SpyObj<GameSessionManagerService>;
    let statisticsManagerSpy: jasmine.SpyObj<StatisticsManagerService>;
    let gameEventServiceSpy: jasmine.SpyObj<GameEventService>;
    let standardBoard: BoardGame;
    let player: Player = STANDARD_PLAYER;

    beforeEach(() => {
        socketHelper = new SocketTestHelper();
        socketServiceMock = new SocketClientServiceMock();
        socketServiceMock.socket = socketHelper as unknown as Socket;
        // gameSessionManagerSpy.gameId = jasmine.createSpy().and.returnValue('mocked-game-id');

        gameSessionManagerSpy = jasmine.createSpyObj('GameSessionManagerService', [
            'gameId',
            'updatePlayersInfos',
            'canEndTurn',
            'updateChosenPlayer',
            'updateBoardGame',
            'changeState',
            'shouldChangeTurn',
            'endTurn',
            'playerState',
            'updateCanTelePort',
            'updateCanStartFight',
            'updateCanExecuteAttack',
            'updateCanEscape',
            'updateCanToggleDoor',
            'updateHandledDoors',
            'updateVisitedTiles',
            'validItemPresent',
            'pickUpItem',
            'gameMode',
            'activePlayer',
        ]);

        statisticsManagerSpy = jasmine.createSpyObj('staticsManager', ['updateTilePercentage', 'updatePlayerTilePercentage', 'updateDoorPercentage']);

        gameEventServiceSpy = jasmine.createSpyObj('GameEventService', [
            'addLog',
            'showFirstTurnNotification',
            'showLogStartAttackNotification',
            'showLogEndAttackNotification',
            'showLogToggleDoorNotification',
        ]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).chosenPlayer = () => STANDARD_PLAYER;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).activePlayer = () => player;

        TestBed.configureTestingModule({
            providers: [
                { provide: SocketClientService, useValue: socketServiceMock },
                { provide: GameSessionManagerService, useValue: gameSessionManagerSpy },
                { provide: StatisticsManagerService, useValue: statisticsManagerSpy },
                { provide: GameEventService, useValue: gameEventServiceSpy },
                MovementEventsHandlerService,
            ],
        });

        socketServiceMock.connect();
        service = TestBed.inject(MovementEventsHandlerService);

        standardBoard = {
            id: '',
            name: 'Default Board',
            description: 'This is a default description for the board game.',
            size: BoardGameSize.Medium,
            gameMode: GameMode.Normal,
            tiles: [
                [
                    { type: TileType.Wall },
                    { type: TileType.Door },
                    {
                        type: TileType.Grass,
                        containedItem: {
                            type: ItemType.AttributeEditor,
                            name: ITEM_NAMES.attributeEditor2,
                            description: FROM_ITEM_NAME_TO_DESCRIPTION[ITEM_NAMES.attributeEditor2],
                        },
                    },
                ],
            ],
            previewImage: 'assets/preview.png',
            visibility: true,
            lastModified: new Date(),
            itemInfos: [],
        };
        service.configureBaseSocket();
    });

    it('should be created', () => {
        // expect(gameSessionManagerSpy.canEndTurn).toHaveBeenCalled();
        expect(service).toBeTruthy();
    });

    it('should update the players information if movePlayer event is received and keep the chosen players info coherent', () => {
        const ans: dataForm.MovePlayer = {
            successful: true,
            message: '',
            boardGame: standardBoard,
            listOfPlayers: [STANDARD_PLAYER],
            activePlayer: STANDARD_LIST_PLAYERS[0],
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).activePlayer = () => STANDARD_LIST_PLAYERS[0];
        socketHelper.peerSideEmit(SocketClientEventNames.MovePlayer, ans);
        expect(gameSessionManagerSpy.updatePlayersInfos).toHaveBeenCalledWith(ans.listOfPlayers, ans.activePlayer);
        expect(gameSessionManagerSpy.updateBoardGame).toHaveBeenCalledWith(ans.boardGame);
        expect(gameSessionManagerSpy.updateChosenPlayer).not.toHaveBeenCalled();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).activePlayer = () => STANDARD_PLAYER;
        socketHelper.peerSideEmit(SocketClientEventNames.MovePlayer, ans);
        expect(gameSessionManagerSpy.updateChosenPlayer).toHaveBeenCalledWith(ans.activePlayer);
    });

    it('should not do anything if the chosenPlayer is the active player when the movement is over', () => {
        const ans: dataForm.StandardRes = {
            successful: true,
            message: '',
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).activePlayer = () => STANDARD_LIST_PLAYERS[0];
        socketHelper.peerSideEmit(SocketClientEventNames.MovementOver, ans);
        expect(gameSessionManagerSpy.changeState).not.toHaveBeenCalled();
        expect(gameSessionManagerSpy.shouldChangeTurn).not.toHaveBeenCalled();
    });
    it("should change the players state into waiting for action if he's still the active player", () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ans: dataForm.StandardRes = {
            successful: true,
            message: '',
        };
        socketHelper.peerSideEmit(SocketClientEventNames.MovementOver, ans);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any

        expect(gameSessionManagerSpy.changeState).toHaveBeenCalledWith(PlayerState.WaitingForAction);
        expect(gameSessionManagerSpy.shouldChangeTurn).toHaveBeenCalled();
        expect(gameSessionManagerSpy.endTurn).not.toHaveBeenCalled();
    });

    it('should end turn after the movement is over if the conditions are met', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        gameSessionManagerSpy.shouldChangeTurn.and.returnValue(true);
        const ans: dataForm.StandardRes = {
            successful: true,
            message: '',
        };
        socketHelper.peerSideEmit(SocketClientEventNames.MovementOver, ans);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(gameSessionManagerSpy.changeState).toHaveBeenCalledWith(PlayerState.WaitingForAction);
        expect(gameSessionManagerSpy.shouldChangeTurn).toHaveBeenCalled();
        expect(gameSessionManagerSpy.endTurn).toHaveBeenCalled();
    });

    it('should update the board and players infos if a toggleDoorState event is received', () => {
        gameSessionManagerSpy.playerState.and.returnValue(PlayerState.OpeningDoor);
        gameSessionManagerSpy.shouldChangeTurn.and.returnValue(false);

        const ans: dataForm.ToggleDoorStateRes = {
            successful: true,
            message: '',
            listOfPlayers: STANDARD_LIST_PLAYERS,
            activePlayer: STANDARD_PLAYER,
            boardGame: standardBoard,
            doorPosition: dummyPos,
            doorState: false,
        };

        socketHelper.peerSideEmit(SocketClientEventNames.ToggleDoorState, ans);

        expect(gameEventServiceSpy.showLogToggleDoorNotification).toHaveBeenCalledWith(ans);
        expect(gameSessionManagerSpy.updatePlayersInfos).toHaveBeenCalledWith(ans.listOfPlayers, ans.activePlayer);
        expect(gameSessionManagerSpy.updateBoardGame).toHaveBeenCalledWith(ans.boardGame);
    });

    it('should not change the the state nor end the turn if the player is not active', () => {
        const ans: dataForm.ToggleDoorStateRes = {
            successful: true,
            message: '',
            listOfPlayers: STANDARD_LIST_PLAYERS,
            activePlayer: STANDARD_PLAYER,
            boardGame: standardBoard,
            doorPosition: dummyPos,
            doorState: true,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).activePlayer = () => STANDARD_LIST_PLAYERS[0];
        socketHelper.peerSideEmit(SocketClientEventNames.ToggleDoorState, ans);
        expect(gameSessionManagerSpy.changeState).not.toHaveBeenCalled();
        expect(gameSessionManagerSpy.shouldChangeTurn).not.toHaveBeenCalled();
    });

    it("should change the state to waiting for action if he's the active player", () => {
        gameSessionManagerSpy.playerState.and.returnValue(PlayerState.OpeningDoor);
        const ans: dataForm.ToggleDoorStateRes = {
            successful: true,
            message: '',
            listOfPlayers: STANDARD_LIST_PLAYERS,
            activePlayer: STANDARD_PLAYER,
            boardGame: standardBoard,
            doorPosition: dummyPos,
            doorState: true,
        };
        gameSessionManagerSpy.shouldChangeTurn.and.returnValue(false);
        socketHelper.peerSideEmit(SocketClientEventNames.ToggleDoorState, ans);
        expect(gameSessionManagerSpy.changeState).toHaveBeenCalledWith(PlayerState.WaitingForAction);
        expect(gameSessionManagerSpy.shouldChangeTurn).toHaveBeenCalled();
        expect(gameSessionManagerSpy.endTurn).not.toHaveBeenCalled();
    });

    it('should end Player turn if all condition are met after changing door state', () => {
        gameSessionManagerSpy.playerState.and.returnValue(PlayerState.OpeningDoor);
        gameSessionManagerSpy.shouldChangeTurn.and.returnValue(true);
        const ans: dataForm.ToggleDoorStateRes = {
            successful: true,
            message: '',
            listOfPlayers: STANDARD_LIST_PLAYERS,
            activePlayer: STANDARD_PLAYER,
            boardGame: standardBoard,
            doorPosition: dummyPos,
            doorState: true,
        };
        gameSessionManagerSpy.shouldChangeTurn.and.returnValue(true);
        socketHelper.peerSideEmit(SocketClientEventNames.ToggleDoorState, ans);
        expect(gameSessionManagerSpy.changeState).toHaveBeenCalledWith(PlayerState.WaitingForAction);
        expect(gameSessionManagerSpy.shouldChangeTurn).toHaveBeenCalled();
        expect(gameSessionManagerSpy.endTurn).toHaveBeenCalled();
    });
    it('should not do anything if the server yields an error', () => {
        const ans = {
            successful: false,
            message: '',
        };
        socketHelper.peerSideEmit(SocketClientEventNames.ToggleDoorState, ans);
        socketHelper.peerSideEmit(SocketClientEventNames.MovementOver, ans);
        socketHelper.peerSideEmit(SocketClientEventNames.MovePlayer, ans);
        socketHelper.peerSideEmit(SocketClientEventNames.Teleport, ans);

        expect(gameSessionManagerSpy.updatePlayersInfos).not.toHaveBeenCalled();
        expect(gameSessionManagerSpy.shouldChangeTurn).not.toHaveBeenCalled();
    });
    it('should handle successful teleport and update game session', () => {
        const ans = {
            successful: true,
            listOfPlayers: STANDARD_LIST_PLAYERS,
            activePlayer: STANDARD_PLAYER,
            boardGame: standardBoard,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).chosenPlayer = () => STANDARD_PLAYER;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).activePlayer = () => STANDARD_PLAYER;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).playerState = () => {
            return PlayerState.WaitingForAction;
        };

        socketHelper.peerSideEmit(SocketClientEventNames.Teleport, ans);

        expect(gameSessionManagerSpy.updatePlayersInfos).toHaveBeenCalledWith(ans.listOfPlayers, ans.activePlayer);
        expect(gameSessionManagerSpy.updateBoardGame).toHaveBeenCalledWith(ans.boardGame);
    });

    it("should pick up an item if a valid item is present at the player's position", () => {
        gameSessionManagerSpy.validItemPresent.and.returnValue(true);

        const ans: dataForm.StandardRes = {
            successful: true,
            message: '',
        };

        socketHelper.peerSideEmit(SocketClientEventNames.MovementOver, ans);

        expect(gameSessionManagerSpy.pickUpItem).toHaveBeenCalled();
        expect(gameSessionManagerSpy.changeState).not.toHaveBeenCalled();
        expect(gameSessionManagerSpy.endTurn).not.toHaveBeenCalled();
    });

    it('should handle movement over when player position is undefined', () => {
        const playerWithUndefinedPosition = { ...STANDARD_PLAYER, position: undefined };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).chosenPlayer = () => playerWithUndefinedPosition;
        gameSessionManagerSpy.validItemPresent.and.returnValue(false);

        const ans: dataForm.StandardRes = {
            successful: true,
            message: '',
        };

        socketHelper.peerSideEmit(SocketClientEventNames.MovementOver, ans);
        expect(gameSessionManagerSpy.validItemPresent).toHaveBeenCalledWith({ x: 0, y: 0 });
        expect(gameSessionManagerSpy.changeState).toHaveBeenCalledWith(PlayerState.WaitingForAction);
    });

    it('should end game when CTF is over', () => {
        const ans: dataForm.StandardRes = {
            successful: true,
            message: '',
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).gameMode = () => GameMode.CTF;
        service.configureBaseSocket();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).ctfIsOver = () => {
            return true;
        };
        socketHelper.peerSideEmit(SocketClientEventNames.MovementOver, ans);
        expect(gameSessionManagerSpy.changeState).toHaveBeenCalledWith(PlayerState.EndGame);
    });

    it('should update chosenPlayer when playerState is teleporting', () => {
        const ans = {
            successful: true,
            listOfPlayers: STANDARD_LIST_PLAYERS,
            activePlayer: STANDARD_PLAYER,
            boardGame: standardBoard,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).playerState = () => {
            return PlayerState.Teleporting;
        };
        socketHelper.peerSideEmit(SocketClientEventNames.Teleport, ans);
        expect(gameSessionManagerSpy.updateChosenPlayer).toHaveBeenCalled();
    });

    it('should call statistics service when player has position', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).ctfIsOver = () => {
            return false;
        };

        player.position = { x: 0, y: 0 };
        const ans = {
            successful: true,
            listOfPlayers: STANDARD_LIST_PLAYERS,
            activePlayer: player,
            boardGame: standardBoard,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).chosenPlayer = () => STANDARD_PLAYER;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).activePlayer = () => {
            return player;
        };
        socketHelper.peerSideEmit(SocketClientEventNames.Teleport, ans);

        expect(statisticsManagerSpy.updateTilePercentage).toHaveBeenCalledWith(player.position);
        expect(statisticsManagerSpy.updatePlayerTilePercentage).toHaveBeenCalled();
    });

    it('should change player state if ctf mode is over', () => {
        const ans = {
            successful: true,
            listOfPlayers: STANDARD_LIST_PLAYERS,
            activePlayer: STANDARD_PLAYER,
            boardGame: standardBoard,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).gameMode = () => GameMode.CTF;
        service.configureBaseSocket();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).ctfIsOver = () => {
            return true;
        };
        socketHelper.peerSideEmit(SocketClientEventNames.Teleport, ans);
        expect(gameSessionManagerSpy.changeState).toHaveBeenCalledWith(PlayerState.EndGame);
    });

    it('should return false when game mode is not CTF', () => {
        spyOn(gameSessionManagerSpy, 'activePlayer');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).gameMode = () => GameMode.Normal;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (service as any).ctfIsOver();
        expect(result).toBeFalse();
        expect(gameSessionManagerSpy.activePlayer).not.toHaveBeenCalled();
    });

    it('should return false in CTF mode when player has no flag', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).gameMode = () => GameMode.CTF;
        const player1 = {
            ...STANDARD_PLAYER,
            position: { x: 0, y: 0 },
            startPosition: { x: 0, y: 0 },
            inventory: [],
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).activePlayer = () => {
            return player1;
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (service as any).ctfIsOver();
        expect(result).toBeFalse();
    });

    it('should return false in CTF mode when player has flag but is not at start position', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).gameMode = () => GameMode.CTF;
        const player1 = {
            ...STANDARD_PLAYER,
            position: { x: 1, y: 0 },
            startPosition: { x: 0, y: 0 },
            inventory: [{ name: ITEM_NAMES.flag, type: ItemType.Flag, description: 'a' }],
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).activePlayer = () => {
            return player1;
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (service as any).ctfIsOver();
        expect(result).toBeFalse();
    });

    it('should return true in CTF mode when player has flag and is at start position', () => {
        Object.defineProperty(gameSessionManagerSpy, 'gameMode', {
            get: () => GameMode.CTF,
        });
        spyOnProperty(gameSessionManagerSpy, 'gameMode', 'get').and.returnValue(GameMode.CTF);

        const playerAtStart = {
            ...STANDARD_PLAYER,
            position: { x: 0, y: 0 },
            startPosition: { x: 0, y: 0 },
            inventory: [{ name: ITEM_NAMES.flag, type: ItemType.Flag }],
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).activePlayer = () => {
            return player;
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).activePlayer = () => playerAtStart;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (service as any).ctfIsOver();
        expect(result).toBeTrue();
    });

    it('activePlayerHasFlag should return false when no inventory', () => {
        player = { ...STANDARD_PLAYER, inventory: undefined };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (service as any).activePlayerHasFlag();
        expect(result).toBeFalse();
    });

    it('activePlayerHasFlag should return false when no flag in inventory', () => {
        player = { ...STANDARD_PLAYER, inventory: [] };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (service as any).activePlayerHasFlag();
        expect(result).toBeFalse();
    });

    it('activePlayerHasFlag should return true when flag in inventory', () => {
        player = { ...STANDARD_PLAYER, inventory: [{ name: ITEM_NAMES.flag, type: ItemType.Flag, description: 'a' }] };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (service as any).activePlayerHasFlag();
        expect(result).toBeTrue();
    });
    it('should update statistics when active player has a position', () => {
        const ans: dataForm.TeleportPlayerRes = {
            successful: true,
            listOfPlayers: STANDARD_LIST_PLAYERS,
            activePlayer: { ...STANDARD_PLAYER, position: { x: 1, y: 1 } },
            boardGame: standardBoard,
            message: '',
        };

        socketHelper.peerSideEmit(SocketClientEventNames.Teleport, ans);

        expect(statisticsManagerSpy.updateTilePercentage).toHaveBeenCalledWith({ x: 1, y: 1 });
        expect(statisticsManagerSpy.updatePlayerTilePercentage).toHaveBeenCalledWith(ans.activePlayer.name, { x: 1, y: 1 });
    });
});

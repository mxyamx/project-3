/* eslint-disable max-lines */
import { signal, WritableSignal } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter, Router, Routes } from '@angular/router';
import { SocketTestHelper } from '@app/classes/socket-test-helper/socket-test-helper';
import {
    ATTACK_LARGE_TIME_LIMIT_SEC,
    ATTACK_SMALL_TIME_LIMIT_SEC,
    INITIAL_AMOUNT_OF_ACTION,
    INITIAL_AMOUNT_OF_EVASION,
    LEAVE_GAME_COOL_DOWN_MSEC,
    MAXIMUM_AMOUNT_OF_ITEM,
    STANDARD_LIST_PLAYERS,
    STANDARD_PLAYER,
    TURN_TIME_LIMIT_SEC,
} from '@app/constants/development-constants';
import { FROM_ITEM_NAME_TO_DESCRIPTION, ITEM_NAMES } from '@app/constants/objects-constants';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { CombatNotificationService } from '@app/services/combat-notification/combat-notification.service';
import { FightEventsHandlerService } from '@app/services/fight-events-handler/fight-events-handler.service';
import { GameEventService } from '@app/services/game-event/game-event.service';
import { GameInterfaceService } from '@app/services/game-interface/game-interface.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { MovementEventsHandlerService } from '@app/services/movement-events-handler/movement-events-handler.service';
import { BoardGame } from '@common/board-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { CtfTeam } from '@common/enums/ctf-team';
import { GameMode } from '@common/enums/game-mode';
import { ItemName } from '@common/enums/item-name';
import { ItemType } from '@common/enums/item-type';
import { PlayerState } from '@common/enums/player-state';
import { SocketClientEventNames } from '@common/enums/socket-events-names';
import { TileType } from '@common/enums/tile-type';
import { Item } from '@common/item';
import * as dataForm from '@common/socket-data-forms';
import { Socket } from 'socket.io-client';
import { GameSocketEventService } from './game-socket-event.service';

class SocketClientServiceMock extends SocketClientService {
    override connect() {
        return;
    }
    override isSocketAlive(): boolean {
        return true;
    }
}
const routes: Routes = [];

const TIMEOUT_DELAY = 1000;

describe('GameSocketEventService', () => {
    let service: GameSocketEventService;
    let socketServiceMock: SocketClientServiceMock;
    let socketHelper: SocketTestHelper;
    let gameSessionManagerSpy: jasmine.SpyObj<GameSessionManagerService>;
    let standardBoard: BoardGame;
    let routerSpy: jasmine.SpyObj<Router>;
    let fightEventsHandlerServiceSpy: jasmine.SpyObj<FightEventsHandlerService>;
    let movementEventsHandlerSpy: jasmine.SpyObj<MovementEventsHandlerService>;
    let mockPlayerState: WritableSignal<PlayerState>;
    let mockNbOfEvasions: WritableSignal<number>;
    let combatNotificationServiceSpy: jasmine.SpyObj<CombatNotificationService>;
    let gameEventServiceSpy: jasmine.SpyObj<GameEventService>;

    beforeEach(() => {
        socketHelper = new SocketTestHelper();
        socketServiceMock = new SocketClientServiceMock();
        socketServiceMock.socket = socketHelper as unknown as Socket;
        mockPlayerState = signal(PlayerState.WaitingForAction);
        mockNbOfEvasions = signal(INITIAL_AMOUNT_OF_EVASION);
        gameEventServiceSpy = jasmine.createSpyObj(
            'GameEventService',
            [
                'addLog',
                'setFilter',
                'updateFilteredEvents',
                'showLogEndNotification',
                'showLogItemNotification',
                'showLogAbandonNotification',
                'showLogEndFightNotification',
                'showLogResultFightNotification',
                'showLogFlagNotification',
                'showLogTurnNotification',
            ],
            {
                events: [],
            },
        );

        gameSessionManagerSpy = jasmine.createSpyObj(
            'GameSessionManagerService',
            [
                'updatePlayersInfos',
                'gameId',
                'listOfPlayers',
                'canEndTurn',
                'updateChosenPlayer',
                'updateBoardGame',
                'changeState',
                'shouldChangeTurn',
                'endTurn',
                'updateAttackingPlayer',
                'updateDefendingPlayer',
                'updateNbOfEvasions',
                'updateNbOfActions',
                'updateCanEndTurn',
                'attackPlayer',
                'updateActivePlayer',
                'updateListOfPlayers',
                'updateDisplayedList',
                'updateDisplayedPlayerList',
                'leaveGame',
                'displayedPlayerList',
                'chosenPlayer',
                'updateTurnClockValue',
                'updateFightClockValue',
                'updateDebugMode',
                'updateCanTelePort',
                'updateCanStartFight',
                'updateCanExecuteAttack',
                'updateCanEscape',
                'updateCanToggleDoor',
                'updateCanDropItem',
                'updateCanUseItem',
                'updateCanUseTeleport',
                'updateCanPickUpItem',
                'updateShowDropItemInterface',
                'updateCanToggleDebugMode',
                'incrementAmountOfAction',
                'decrementAmountOfAction',
                'updateLargestAmountOfEscape',
                'updateChangeDisplayAttackClock',
            ],
            {
                playerState: mockPlayerState,
                nbOfEvasions: mockNbOfEvasions,
                turnClockValue: signal(0),
                fightClockValue: signal(0),
            },
        );
        fightEventsHandlerServiceSpy = jasmine.createSpyObj('fightEventsHandlerServiceSpy', ['configureBaseSocket']);
        movementEventsHandlerSpy = jasmine.createSpyObj('MovementEventsHandlerService', ['configureBaseSocket']);
        routerSpy = jasmine.createSpyObj('router', ['navigate']);

        combatNotificationServiceSpy = jasmine.createSpyObj('CombatNotificationService', [
            'showVictoryNotification',
            'showDefeatNotification',
            'showGameOverNotification',
            'showTurnTransition',
            'hideTurnTransition',
            'hideDefeatNotification',
            'hideVictoryNotification',
            'hideGameOverNotification',
        ]);

        const gameInterfaceServiceSpy = jasmine.createSpyObj('GameInterfaceService', ['hideInterface', 'showInterface', 'hideEscapeConfirmation']);

        gameSessionManagerSpy.chosenPlayer.and.returnValue(STANDARD_PLAYER);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).activePlayer = () => STANDARD_PLAYER;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).attackingPlayer = () => STANDARD_PLAYER;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).defendingPlayer = () => STANDARD_PLAYER;

        TestBed.configureTestingModule({
            providers: [
                { provide: SocketClientService, useValue: socketServiceMock },
                { provide: GameSessionManagerService, useValue: gameSessionManagerSpy },
                { provide: FightEventsHandlerService, useValue: fightEventsHandlerServiceSpy },
                { provide: MovementEventsHandlerService, useValue: movementEventsHandlerSpy },
                { provide: Router, useValue: routerSpy },
                { provide: CombatNotificationService, useValue: combatNotificationServiceSpy },
                { provide: GameInterfaceService, useValue: gameInterfaceServiceSpy },
                { provide: GameEventService, useValue: gameEventServiceSpy },
                GameSocketEventService,
                provideRouter(routes),
            ],
        });
        service = TestBed.inject(GameSocketEventService);

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
        service.configureBaseSocket(routerSpy);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should use the other handlers for specific tasks', () => {
        expect(fightEventsHandlerServiceSpy.configureBaseSocket).toHaveBeenCalled();
        expect(movementEventsHandlerSpy.configureBaseSocket).toHaveBeenCalled();
    });

    it('should reset reset all of the values and set the players state to transitioning at the end of a turn', () => {
        const ans: dataForm.EndTurnRes = {
            boardGame: standardBoard,
            successful: true,
            message: '',
            listOfPlayers: STANDARD_LIST_PLAYERS,
            activePlayer: STANDARD_PLAYER,
        };

        socketHelper.peerSideEmit(SocketClientEventNames.EndTurn, ans);
        expect(gameSessionManagerSpy.updateNbOfActions).toHaveBeenCalledWith(INITIAL_AMOUNT_OF_ACTION);
        expect(gameSessionManagerSpy.updateNbOfEvasions).toHaveBeenCalledWith(INITIAL_AMOUNT_OF_EVASION);
        expect(gameSessionManagerSpy.changeState).toHaveBeenCalledWith(PlayerState.Transitioning);
        expect(gameSessionManagerSpy.updatePlayersInfos).toHaveBeenCalledWith(ans.listOfPlayers, ans.activePlayer);
    });

    it('should reset fight clock to 0 if switchingTurn is true when clock event is received', () => {
        Object.defineProperty(gameSessionManagerSpy, 'switchingTurn', {
            get: () => true,
        });
        const clockData: dataForm.ClockRes = {
            successful: true,
            turnClockValue: 30,
            fightClockValue: 10,
            message: '',
        };

        socketHelper.peerSideEmit(SocketClientEventNames.Clock, clockData);

        expect(gameSessionManagerSpy.updateFightClockValue).toHaveBeenCalledWith(0);
    });

    it('should update actions to 2 when player has GameEditor2 item', fakeAsync(() => {
        const item: Item = {
            name: ItemName.GameEditor2,
            type: ItemType.GameEditor,
            description: 'Test Item',
        };
        const playerWithItem = {
            ...STANDARD_PLAYER,
            inventory: [item],
        };
        gameSessionManagerSpy.chosenPlayer.and.returnValue(playerWithItem);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).activePlayer = () => playerWithItem;
        const ans: dataForm.EndTurnRes = {
            boardGame: standardBoard,
            successful: true,
            message: '',
            listOfPlayers: [playerWithItem],
            activePlayer: playerWithItem,
        };
        socketHelper.peerSideEmit(SocketClientEventNames.EndTurn, ans);
        tick();
        expect(gameSessionManagerSpy.updateNbOfActions).toHaveBeenCalledWith(INITIAL_AMOUNT_OF_ACTION);
        expect(gameSessionManagerSpy.updateNbOfActions).toHaveBeenCalledWith(2);
    }));

    it('should increment amount of action when picking up GameEditor2 item', () => {
        const pickedItem = {
            name: ItemName.GameEditor2,
            type: ItemType.GameEditor,
            description: 'Test Item',
        };

        const ans: dataForm.PickUpItemRes = {
            successful: true,
            boardGame: standardBoard,
            listOfPlayers: STANDARD_LIST_PLAYERS,
            activePlayer: STANDARD_PLAYER,
            message: '',
            pickedItem,
        };
        gameSessionManagerSpy.chosenPlayer.and.returnValue(STANDARD_PLAYER);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).activePlayer = () => STANDARD_PLAYER;

        socketHelper.peerSideEmit(SocketClientEventNames.PickUpItem, ans);

        expect(gameSessionManagerSpy.incrementAmountOfAction).toHaveBeenCalled();
        expect(gameEventServiceSpy.showLogItemNotification).toHaveBeenCalledWith(ans);
    });

    it('should increment limitOfItems when picking up GameEditor1 item', () => {
        const pickedItem = {
            name: ItemName.GameEditor1,
            type: ItemType.GameEditor,
            description: 'Test Item',
        };

        const ans: dataForm.PickUpItemRes = {
            successful: true,
            boardGame: standardBoard,
            listOfPlayers: STANDARD_LIST_PLAYERS,
            activePlayer: STANDARD_PLAYER,
            message: '',
            pickedItem,
        };
        gameSessionManagerSpy.chosenPlayer.and.returnValue(STANDARD_PLAYER);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).activePlayer = () => STANDARD_PLAYER;

        const initialLimit = service['limitOfItems'];

        socketHelper.peerSideEmit(SocketClientEventNames.PickUpItem, ans);

        expect(service['limitOfItems']).toBe(initialLimit + 1);
    });

    it('should show a notification when the flag is picked up', () => {
        const pickedItem = {
            name: ItemName.Flag,
            type: ItemType.Flag,
            description: 'Test Flag',
        };

        const ans: dataForm.PickUpItemRes = {
            successful: true,
            boardGame: standardBoard,
            listOfPlayers: STANDARD_LIST_PLAYERS,
            activePlayer: STANDARD_PLAYER,
            message: '',
            pickedItem,
        };
        gameSessionManagerSpy.chosenPlayer.and.returnValue(STANDARD_PLAYER);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).activePlayer = () => STANDARD_PLAYER;

        socketHelper.peerSideEmit(SocketClientEventNames.PickUpItem, ans);
        expect(gameEventServiceSpy.showLogFlagNotification).toHaveBeenCalledWith(ans);
    });

    it("should set player state to waiting for turn if he's not the activePlayer at the start of a turn", () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ans: any = {
            successful: true,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).chosenPlayer = () => STANDARD_LIST_PLAYERS[0];
        socketHelper.peerSideEmit(SocketClientEventNames.StartTurn, ans);

        expect(gameSessionManagerSpy.changeState).toHaveBeenCalledWith(PlayerState.WaitingForTurn);
        expect(gameSessionManagerSpy.changeState).not.toHaveBeenCalledWith(PlayerState.WaitingForAction);
    });

    it("should start the player state to waiting for action if he's the active player and reset canEndTurn", () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ans: any = {
            successful: true,
        };

        socketHelper.peerSideEmit(SocketClientEventNames.StartTurn, ans);
        expect(gameSessionManagerSpy.changeState).toHaveBeenCalledWith(PlayerState.WaitingForAction);
        expect(gameSessionManagerSpy.updateCanEndTurn).toHaveBeenCalledWith(true);
    });

    it('should end the player turn if the time limit has been reached', () => {
        const ans: dataForm.ClockRes = {
            successful: true,
            message: '',
            turnClockValue: TURN_TIME_LIMIT_SEC,
            fightClockValue: 0,
        };

        mockPlayerState.set(PlayerState.WaitingForAction);
        socketHelper.peerSideEmit(SocketClientEventNames.Clock, ans);

        expect(gameSessionManagerSpy.endTurn).toHaveBeenCalled();
    });
    it('should attack the opponent if the time limit has been reached', () => {
        mockPlayerState.set(PlayerState.Attacking);
        mockNbOfEvasions.set(1);

        const ans: dataForm.ClockRes = {
            successful: true,
            message: '',
            turnClockValue: 0,
            fightClockValue: ATTACK_LARGE_TIME_LIMIT_SEC,
        };

        socketHelper.peerSideEmit(SocketClientEventNames.Clock, ans);

        expect(gameSessionManagerSpy.attackPlayer).toHaveBeenCalled();
    });

    it('should update the game information when requested', () => {
        const ans: dataForm.UpdateGamedRes = {
            successful: true,
            message: '',
            boardGame: standardBoard,
            listOfPlayers: STANDARD_LIST_PLAYERS,
            activePlayer: STANDARD_PLAYER,
        };

        socketHelper.peerSideEmit(SocketClientEventNames.UpdateGame, ans);
        expect(gameSessionManagerSpy.updateBoardGame).toHaveBeenCalledWith(ans.boardGame);
        expect(gameSessionManagerSpy.updateActivePlayer).toHaveBeenCalledWith(ans.activePlayer);
        expect(gameSessionManagerSpy.updateListOfPlayers).toHaveBeenCalledWith(ans.listOfPlayers);
    });

    it('should not do anything if the server yields an error', () => {
        const ans = {
            successful: false,
            message: '',
        };
        socketHelper.peerSideEmit(SocketClientEventNames.UpdateGame, ans);
        socketHelper.peerSideEmit(SocketClientEventNames.EndGame, ans);
        socketHelper.peerSideEmit(SocketClientEventNames.Clock, ans);
        socketHelper.peerSideEmit(SocketClientEventNames.StartTurn, ans);
        socketHelper.peerSideEmit(SocketClientEventNames.EndTurn, ans);
        socketHelper.peerSideEmit(SocketClientEventNames.ShowEndFightNotification, ans);
        socketHelper.peerSideEmit(SocketClientEventNames.ProcessEscapeAttempt, ans);
        socketHelper.peerSideEmit(SocketClientEventNames.ToggleDebugMode, ans);
        socketHelper.peerSideEmit(SocketClientEventNames.DeactivateDebugMode, ans);
        socketHelper.peerSideEmit(SocketClientEventNames.DropItem, ans);
        socketHelper.peerSideEmit(SocketClientEventNames.PickUpItem, ans);

        expect(gameSessionManagerSpy.updatePlayersInfos).not.toHaveBeenCalled();
        expect(gameSessionManagerSpy.shouldChangeTurn).not.toHaveBeenCalled();
    });

    it('should attack player if the fight clock time limit is reached and player is attacking', () => {
        mockPlayerState.set(PlayerState.Attacking);
        mockNbOfEvasions.set(1);

        const ans: dataForm.ClockRes = {
            successful: true,
            message: '',
            turnClockValue: 0,
            fightClockValue: ATTACK_LARGE_TIME_LIMIT_SEC,
        };

        socketHelper.peerSideEmit(SocketClientEventNames.Clock, ans);

        expect(gameSessionManagerSpy.attackPlayer).toHaveBeenCalled();
    });
    it('should attack player if the fight clock time limit is reached and player is attacking - 2', () => {
        mockPlayerState.set(PlayerState.Attacking);
        mockNbOfEvasions.set(0);

        const ans: dataForm.ClockRes = {
            successful: true,
            message: '',
            turnClockValue: 0,
            fightClockValue: ATTACK_SMALL_TIME_LIMIT_SEC,
        };

        socketHelper.peerSideEmit(SocketClientEventNames.Clock, ans);

        expect(gameSessionManagerSpy.attackPlayer).toHaveBeenCalled();
    });

    it('should show victory notification when player wins a fight', () => {
        const notificationServiceSpy = TestBed.inject(CombatNotificationService) as jasmine.SpyObj<CombatNotificationService>;

        const ans: dataForm.endFightNotification = {
            successful: true,
            message: '',
            winnerName: STANDARD_PLAYER.name,
            loserName: 'Other Player',
        };

        socketHelper.peerSideEmit(SocketClientEventNames.ShowEndFightNotification, ans);

        expect(notificationServiceSpy.showVictoryNotification).toHaveBeenCalled();
    });

    it('should show defeat notification when player loses a fight', () => {
        const notificationServiceSpy = TestBed.inject(CombatNotificationService) as jasmine.SpyObj<CombatNotificationService>;

        const ans: dataForm.endFightNotification = {
            successful: true,
            message: '',
            winnerName: 'Other Player',
            loserName: STANDARD_PLAYER.name,
        };

        socketHelper.peerSideEmit(SocketClientEventNames.ShowEndFightNotification, ans);

        expect(notificationServiceSpy.showDefeatNotification).toHaveBeenCalled();
    });

    it('should hide interface when receiving an escape confirmation', () => {
        const gameInterfaceServiceSpy = TestBed.inject(GameInterfaceService) as jasmine.SpyObj<GameInterfaceService>;

        const ans: dataForm.EscapeAttemptRes = {
            successful: true,
            message: 'Player has escaped successfully',
        };

        socketHelper.peerSideEmit(SocketClientEventNames.ProcessEscapeAttempt, ans);

        expect(gameInterfaceServiceSpy.hideInterface).toHaveBeenCalled();
    });

    it('should not hide interface when escape message does not contain "escaped"', () => {
        const gameInterfaceServiceSpy = TestBed.inject(GameInterfaceService) as jasmine.SpyObj<GameInterfaceService>;

        const ans: dataForm.EscapeAttemptRes = {
            successful: true,
            message: 'Player failed to escape',
        };

        socketHelper.peerSideEmit(SocketClientEventNames.ProcessEscapeAttempt, ans);

        expect(gameInterfaceServiceSpy.hideInterface).not.toHaveBeenCalled();
    });

    it('should navigate to home after leaving game', fakeAsync(() => {
        gameSessionManagerSpy.leaveGame.and.callFake(() => {
            setTimeout(() => {
                routerSpy.navigate(['./home']);
            }, LEAVE_GAME_COOL_DOWN_MSEC);
        });

        gameSessionManagerSpy.leaveGame();

        tick(LEAVE_GAME_COOL_DOWN_MSEC + TIMEOUT_DELAY);

        expect(routerSpy.navigate).toHaveBeenCalledWith(['./home']);
    }));

    it('should not process end fight notification if not successful', () => {
        const notificationServiceSpy = TestBed.inject(CombatNotificationService) as jasmine.SpyObj<CombatNotificationService>;

        const ans: dataForm.endFightNotification = {
            successful: false,
            message: 'Error',
            winnerName: 'Player1',
            loserName: 'Player2',
        };

        socketHelper.peerSideEmit(SocketClientEventNames.ShowEndFightNotification, ans);

        expect(notificationServiceSpy.showVictoryNotification).not.toHaveBeenCalled();
        expect(notificationServiceSpy.showDefeatNotification).not.toHaveBeenCalled();
    });

    it('should show winner and navigate to stats page after game over if there is a winner', fakeAsync(() => {
        const ans: dataForm.EndGameRes = {
            successful: true,
            message: '',
            winner: STANDARD_PLAYER,
        };

        socketHelper.peerSideEmit(SocketClientEventNames.EndGame, ans);

        tick((TIMEOUT_DELAY + LEAVE_GAME_COOL_DOWN_MSEC) * 2);

        expect(combatNotificationServiceSpy.showGameOverNotification).toHaveBeenCalledWith(STANDARD_PLAYER.name);
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/statistics']);
    }));
    it('should navigate to home after game over even without  winner', fakeAsync(() => {
        const ans: dataForm.EndGameRes = {
            successful: true,
            message: '',
            winner: undefined,
        };

        socketHelper.peerSideEmit(SocketClientEventNames.EndGame, ans);

        tick((TIMEOUT_DELAY + LEAVE_GAME_COOL_DOWN_MSEC) * 2);

        expect(combatNotificationServiceSpy.showGameOverNotification).toHaveBeenCalled();
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/statistics']);
    }));

    it('should toggle debug mode when requested', () => {
        const ans: dataForm.ToggleDebugModeRes = {
            successful: true,
            message: '',
            debugModeStatus: true,
        };

        socketHelper.peerSideEmit(SocketClientEventNames.ToggleDebugMode, ans);
        expect(gameSessionManagerSpy.updateDebugMode).toHaveBeenCalledOnceWith(true);
    });
    it('should deactivate debug mode when requested', () => {
        const ans: dataForm.DeactivateDebugModeRes = {
            successful: true,
            message: '',
            debugModeStatus: false,
        };

        socketHelper.peerSideEmit(SocketClientEventNames.DeactivateDebugMode, ans);
        expect(gameSessionManagerSpy.updateDebugMode).toHaveBeenCalledOnceWith(false);
    });
    it('should handle DropItem event and update game state when successful', () => {
        const ans: dataForm.DropItemRes = {
            successful: true,
            boardGame: standardBoard,
            listOfPlayers: STANDARD_LIST_PLAYERS,
            activePlayer: STANDARD_LIST_PLAYERS[0],
            message: '',
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).chosenPlayer = () => STANDARD_LIST_PLAYERS[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).activePlayer = () => STANDARD_LIST_PLAYERS[0];
        gameSessionManagerSpy.shouldChangeTurn.and.returnValue(false);

        socketHelper.peerSideEmit(SocketClientEventNames.DropItem, ans);

        expect(gameSessionManagerSpy.updateBoardGame).toHaveBeenCalledWith(ans.boardGame);
        expect(gameSessionManagerSpy.updatePlayersInfos).toHaveBeenCalledWith(ans.listOfPlayers, ans.activePlayer);
        expect(gameSessionManagerSpy.updateCanDropItem).toHaveBeenCalledWith(true);
        expect(gameSessionManagerSpy.changeState).toHaveBeenCalledWith(PlayerState.WaitingForAction);
        expect(gameSessionManagerSpy.endTurn).not.toHaveBeenCalled();
    });
    it('should end the turn if conditions are met', () => {
        const ans: dataForm.DropItemRes = {
            successful: true,
            boardGame: standardBoard,
            listOfPlayers: STANDARD_LIST_PLAYERS,
            activePlayer: STANDARD_LIST_PLAYERS[0],
            message: '',
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).chosenPlayer = () => STANDARD_LIST_PLAYERS[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).activePlayer = () => STANDARD_LIST_PLAYERS[0];
        gameSessionManagerSpy.shouldChangeTurn.and.returnValue(true);
        gameSessionManagerSpy.shouldChangeTurn.and.returnValue(true);

        socketHelper.peerSideEmit(SocketClientEventNames.DropItem, ans);

        expect(gameSessionManagerSpy.updateBoardGame).toHaveBeenCalledWith(ans.boardGame);
        expect(gameSessionManagerSpy.updatePlayersInfos).toHaveBeenCalledWith(ans.listOfPlayers, ans.activePlayer);
        expect(gameSessionManagerSpy.updateCanDropItem).toHaveBeenCalledWith(true);
        expect(gameSessionManagerSpy.changeState).toHaveBeenCalledWith(PlayerState.WaitingForAction);
        expect(gameSessionManagerSpy.endTurn).toHaveBeenCalled();
    });
    it('should not change state or end turn if chosenPlayer is not the activePlayer', () => {
        const ans: dataForm.DropItemRes = {
            successful: true,
            boardGame: standardBoard,
            listOfPlayers: STANDARD_LIST_PLAYERS,
            activePlayer: STANDARD_LIST_PLAYERS[0],
            message: '',
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).chosenPlayer = () => STANDARD_PLAYER;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).activePlayer = () => STANDARD_LIST_PLAYERS[0];

        socketHelper.peerSideEmit(SocketClientEventNames.DropItem, ans);

        expect(gameSessionManagerSpy.updateBoardGame).toHaveBeenCalledWith(ans.boardGame);
        expect(gameSessionManagerSpy.updatePlayersInfos).toHaveBeenCalledWith(ans.listOfPlayers, ans.activePlayer);
        expect(gameSessionManagerSpy.updateCanDropItem).toHaveBeenCalledWith(true);
        expect(gameSessionManagerSpy.changeState).not.toHaveBeenCalled();
        expect(gameSessionManagerSpy.endTurn).not.toHaveBeenCalled();
    });
    it('should handle PickUpItem event and update game state when successful', () => {
        const ans: dataForm.PickUpItemRes = {
            successful: true,
            boardGame: standardBoard,
            listOfPlayers: STANDARD_LIST_PLAYERS,
            activePlayer: STANDARD_LIST_PLAYERS[0],
            message: '',
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).chosenPlayer = () => STANDARD_LIST_PLAYERS[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).activePlayer = () => STANDARD_LIST_PLAYERS[0];
        gameSessionManagerSpy.shouldChangeTurn.and.returnValue(false);

        socketHelper.peerSideEmit(SocketClientEventNames.PickUpItem, ans);

        expect(gameSessionManagerSpy.updateBoardGame).toHaveBeenCalledWith(ans.boardGame);
        expect(gameSessionManagerSpy.updatePlayersInfos).toHaveBeenCalledWith(ans.listOfPlayers, ans.activePlayer);
        expect(gameSessionManagerSpy.updateCanPickUpItem).toHaveBeenCalledWith(true);
        expect(gameSessionManagerSpy.changeState).toHaveBeenCalledWith(PlayerState.WaitingForAction);
        expect(gameSessionManagerSpy.endTurn).not.toHaveBeenCalled();
    });

    it('should update game state and show drop item interface when inventory is full', () => {
        const ans: dataForm.PickUpItemRes = {
            successful: true,
            boardGame: standardBoard,
            listOfPlayers: STANDARD_LIST_PLAYERS,
            activePlayer: STANDARD_LIST_PLAYERS[0],
            message: '',
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).chosenPlayer = () => ({
            name: STANDARD_LIST_PLAYERS[0].name,
            inventory: Array(MAXIMUM_AMOUNT_OF_ITEM).fill({}),
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).activePlayer = () => STANDARD_LIST_PLAYERS[0];

        socketHelper.peerSideEmit(SocketClientEventNames.PickUpItem, ans);

        expect(gameSessionManagerSpy.updateBoardGame).toHaveBeenCalledWith(ans.boardGame);
        expect(gameSessionManagerSpy.updatePlayersInfos).toHaveBeenCalledWith(ans.listOfPlayers, ans.activePlayer);
        expect(gameSessionManagerSpy.updateCanPickUpItem).toHaveBeenCalledWith(true);
        expect(gameSessionManagerSpy.changeState).toHaveBeenCalledWith(PlayerState.DroppingItem);
        expect(gameSessionManagerSpy.updateShowDropItemInterface).toHaveBeenCalledWith(true);
    });

    it('should decrement amount of action when dropping GameEditor2 item', () => {
        const droppedItem = {
            name: ItemName.GameEditor2,
            type: ItemType.GameEditor,
            description: 'Test Item',
        };

        const ans: dataForm.DropItemRes = {
            successful: true,
            boardGame: standardBoard,
            listOfPlayers: STANDARD_LIST_PLAYERS,
            activePlayer: STANDARD_LIST_PLAYERS[0],
            message: '',
            droppedItem,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).chosenPlayer = () => STANDARD_LIST_PLAYERS[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).activePlayer = () => STANDARD_LIST_PLAYERS[0];
        socketHelper.peerSideEmit(SocketClientEventNames.DropItem, ans);
        expect(gameSessionManagerSpy.decrementAmountOfAction).toHaveBeenCalled();
    });

    it('should reset limitOfItems when dropping GameEditor1 item and check inventory', () => {
        const droppedItem = {
            name: ItemName.GameEditor1,
            type: ItemType.GameEditor,
            description: 'Test Item',
        };
        const playerWithFullInventory = {
            ...STANDARD_LIST_PLAYERS[0],
            inventory: Array(MAXIMUM_AMOUNT_OF_ITEM).fill({}),
        };

        const ans: dataForm.DropItemRes = {
            successful: true,
            boardGame: standardBoard,
            listOfPlayers: [playerWithFullInventory],
            activePlayer: playerWithFullInventory,
            message: '',
            droppedItem,
        };
        service['limitOfItems'] = MAXIMUM_AMOUNT_OF_ITEM + 1;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).chosenPlayer = () => playerWithFullInventory;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).activePlayer = () => playerWithFullInventory;
        socketHelper.peerSideEmit(SocketClientEventNames.DropItem, ans);
        expect(service['limitOfItems']).toBe(MAXIMUM_AMOUNT_OF_ITEM);
        expect(gameSessionManagerSpy.updateShowDropItemInterface).toHaveBeenCalledWith(true);
    });

    it('should end the turn if conditions are met', () => {
        const ans: dataForm.PickUpItemRes = {
            successful: true,
            boardGame: standardBoard,
            listOfPlayers: STANDARD_LIST_PLAYERS,
            activePlayer: STANDARD_LIST_PLAYERS[0],
            message: '',
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).chosenPlayer = () => STANDARD_LIST_PLAYERS[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).activePlayer = () => STANDARD_LIST_PLAYERS[0];
        gameSessionManagerSpy.shouldChangeTurn.and.returnValue(true);

        socketHelper.peerSideEmit(SocketClientEventNames.PickUpItem, ans);

        expect(gameSessionManagerSpy.updateBoardGame).toHaveBeenCalledWith(ans.boardGame);
        expect(gameSessionManagerSpy.updatePlayersInfos).toHaveBeenCalledWith(ans.listOfPlayers, ans.activePlayer);
        expect(gameSessionManagerSpy.updateCanPickUpItem).toHaveBeenCalledWith(true);
        expect(gameSessionManagerSpy.changeState).toHaveBeenCalledWith(PlayerState.WaitingForAction);
        expect(gameSessionManagerSpy.endTurn).toHaveBeenCalled();
    });

    it('should not change state or end turn if chosenPlayer is not the activePlayer', () => {
        const ans: dataForm.PickUpItemRes = {
            successful: true,
            boardGame: standardBoard,
            listOfPlayers: STANDARD_LIST_PLAYERS,
            activePlayer: STANDARD_LIST_PLAYERS[0],
            message: '',
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).chosenPlayer = () => STANDARD_PLAYER;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).activePlayer = () => STANDARD_LIST_PLAYERS[0];

        socketHelper.peerSideEmit(SocketClientEventNames.PickUpItem, ans);

        expect(gameSessionManagerSpy.updateBoardGame).toHaveBeenCalledWith(ans.boardGame);
        expect(gameSessionManagerSpy.updatePlayersInfos).toHaveBeenCalledWith(ans.listOfPlayers, ans.activePlayer);
        expect(gameSessionManagerSpy.updateCanPickUpItem).toHaveBeenCalledWith(true);
        expect(gameSessionManagerSpy.changeState).not.toHaveBeenCalled();
        expect(gameSessionManagerSpy.endTurn).not.toHaveBeenCalled();
    });

    it('should show team winner notification when game ends with team 1 winner', fakeAsync(() => {
        const ans: dataForm.EndGameRes = {
            successful: true,
            message: '',
            winnerTeam: CtfTeam.FirstTeam,
        };

        socketHelper.peerSideEmit(SocketClientEventNames.EndGame, ans);

        tick((TIMEOUT_DELAY + LEAVE_GAME_COOL_DOWN_MSEC) * 2);

        expect(combatNotificationServiceSpy.showGameOverNotification).toHaveBeenCalledWith("l'équipe " + CtfTeam.FirstTeam);
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/statistics']);
    }));

    it('should show team winner notification when game ends with team 2 winner', fakeAsync(() => {
        const ans: dataForm.EndGameRes = {
            successful: true,
            message: '',
            winnerTeam: CtfTeam.SecondTeam,
        };

        socketHelper.peerSideEmit(SocketClientEventNames.EndGame, ans);

        tick((TIMEOUT_DELAY + LEAVE_GAME_COOL_DOWN_MSEC) * 2);

        expect(combatNotificationServiceSpy.showGameOverNotification).toHaveBeenCalledWith("l'équipe " + CtfTeam.SecondTeam);
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/statistics']);
    }));
});

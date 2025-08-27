/* eslint-disable max-lines */
import { TestBed } from '@angular/core/testing';
import {
    INITIAL_AMOUNT_OF_ACTION,
    INITIAL_AMOUNT_OF_EVASION,
    STANDARD_GAME_CODE,
    STANDARD_LIST_PLAYERS,
    STANDARD_PLAYER,
    STANDARD_PLAYERS,
    TURN_TIME_LIMIT_SEC,
} from '@app/constants/development-constants';
import { FROM_ITEM_NAME_TO_DESCRIPTION, FROM_ITEM_NAME_TO_TYPE, ITEM_NAMES } from '@app/constants/objects-constants';
import { ActionDetectorService } from '@app/services/action-detector/action-detector.service';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { FightSystemManagerService } from '@app/services/fight-system-manager/fight-system-manager.service';
import { MovementSystemManagerService } from '@app/services/movement-system-manager/movement-system-manager.service';
import { PlayerStateManagerService } from '@app/services/player-state-manager/player-state-manager.service';
import { BoardGame } from '@common/board-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { GameMode } from '@common/enums/game-mode';
import { ItemType } from '@common/enums/item-type';
import { PlayerState } from '@common/enums/player-state';
import { SocketServerEventNames } from '@common/enums/socket-events-names';
import { TileType } from '@common/enums/tile-type';
import { Item } from '@common/item';
import { Player } from '@common/player';
import { Position } from '@common/position';
import * as dataForm from '@common/socket-data-forms';
import { Tile } from '@common/tile';
import { GameSessionManagerService } from './game-session-manager.service';

describe('GameSessionManagerService', () => {
    let service: GameSessionManagerService;
    let boardGameManagerSpy: jasmine.SpyObj<BoardGameManagerService>;
    let standardBoard: BoardGame;
    let movementSystemManagerSpy: jasmine.SpyObj<MovementSystemManagerService>;
    let fightSystemManagerSpy: jasmine.SpyObj<FightSystemManagerService>;
    let socketClientServiceSpy: jasmine.SpyObj<SocketClientService>;
    let playerStateManagerSpy: jasmine.SpyObj<PlayerStateManagerService>;
    let actionDetectorSpy: jasmine.SpyObj<ActionDetectorService>;

    beforeEach(() => {
        boardGameManagerSpy = jasmine.createSpyObj('BoardGameManagerService', ['updateDisplayedBoardGame', 'playingBoardGame']);
        movementSystemManagerSpy = jasmine.createSpyObj('movementSystemManagerSpy', ['movePlayer', 'toggleDoorState', 'teleportPlayer']);
        fightSystemManagerSpy = jasmine.createSpyObj('FightSystemManager', ['executeAttack', 'attemptEscape', 'startAttack', 'attackPlayer']);
        socketClientServiceSpy = jasmine.createSpyObj('socketClientServiceSpy', ['connect', 'send', 'disconnect', 'isSocketAlive', 'emit']);
        playerStateManagerSpy = jasmine.createSpyObj('PlayerStateManager', ['changeState', 'reachableNodes']);
        actionDetectorSpy = jasmine.createSpyObj('ActionDetector', ['deactivateAction', 'setActionStatus', 'checkAvailableAction', 'activateAction']);
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

        TestBed.configureTestingModule({
            providers: [
                GameSessionManagerService,
                { provide: BoardGameManagerService, useValue: boardGameManagerSpy },
                { provide: SocketClientService, useValue: socketClientServiceSpy },
                { provide: PlayerStateManagerService, useValue: playerStateManagerSpy },
                { provide: ActionDetectorService, useValue: actionDetectorSpy },
                { provide: FightSystemManagerService, useValue: fightSystemManagerSpy },
                { provide: MovementSystemManagerService, useValue: movementSystemManagerSpy },
            ],
        });

        socketClientServiceSpy.isSocketAlive.and.returnValue(true);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (actionDetectorSpy as any).actionActivated = {
            asReadonly: () => {
                return true;
            },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (playerStateManagerSpy as any).playerState = {
            asReadonly: () => {
                return PlayerState.WaitingForAction;
            },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (boardGameManagerSpy as any).playingBoardGame = () => {
            return standardBoard;
        };

        service = TestBed.inject(GameSessionManagerService);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).playerState = () => {
            return PlayerState.WaitingForAction;
        };
    });

    it('should update gameId', () => {
        service.updateGameId('newGameId');
        expect(service.gameId()).toBe('newGameId');
    });

    it('should update chosenPlayer', () => {
        service.updateChosenPlayer(STANDARD_PLAYER);
        expect(service.chosenPlayer()).toEqual(STANDARD_PLAYER);
    });

    it('should update activePlayer', () => {
        service.updateActivePlayer(STANDARD_PLAYER);
        expect(service.activePlayer()).toEqual(STANDARD_PLAYER);
    });

    it('should update listOfPlayers', () => {
        const players = STANDARD_LIST_PLAYERS;
        service.updateListOfPlayers(players);
        expect(service.listOfPlayers()).toEqual(players);
    });

    it('should check if player is current player correctly', () => {
        service.updateChosenPlayer(STANDARD_PLAYER);
        const isCurrent = service.isCurrentPlayer(STANDARD_PLAYER);
        expect(isCurrent).toBeTrue();
    });

    it('should check if player is current player correctly', () => {
        service.updateChosenPlayer(STANDARD_LIST_PLAYERS[0]);
        const isCurrent = service.isCurrentPlayer(STANDARD_PLAYER);
        expect(isCurrent).toBeFalse();
    });

    it('should return the game mode from boardGameManager', () => {
        const result = service.gameMode;
        expect(result).toBe(GameMode.Normal);
    });

    it('should update board game via boardGameManager', () => {
        service.updateBoardGame(standardBoard);
        expect(boardGameManagerSpy.updateDisplayedBoardGame).toHaveBeenCalledWith(standardBoard, true);
    });

    it('should decrement amount of actions', () => {
        service.updateNbOfActions(INITIAL_AMOUNT_OF_ACTION);
        service.decrementAmountOfAction();
        expect(service.nbOfActions()).toBe(0);
    });

    it('should increment amount of actions', () => {
        service.updateNbOfActions(INITIAL_AMOUNT_OF_ACTION);
        service.incrementAmountOfAction();
        expect(service.nbOfActions()).toBe(2);
    });

    it('should decrement amount of evasions', () => {
        service.updateNbOfEvasions(INITIAL_AMOUNT_OF_EVASION);
        service.decrementAmountOfEvasion();
        expect(service.nbOfEvasions()).toBe(1);
    });

    it('should update attacking player', () => {
        service.updateAttackingPlayer(STANDARD_PLAYER);
        expect(service.attackingPlayer()).toEqual(STANDARD_PLAYER);
    });

    it('should update defending player', () => {
        service.updateDefendingPlayer(STANDARD_PLAYER);
        expect(service.defendingPlayer()).toEqual(STANDARD_PLAYER);
    });

    it('should update number of actions', () => {
        service.updateNbOfActions(INITIAL_AMOUNT_OF_ACTION);
        expect(service.nbOfActions()).toBe(INITIAL_AMOUNT_OF_ACTION);
    });

    it('should update number of evasions', () => {
        service.updateNbOfEvasions(INITIAL_AMOUNT_OF_EVASION);
        expect(service.nbOfEvasions()).toBe(INITIAL_AMOUNT_OF_EVASION);
    });

    it('should update canEndTurn', () => {
        service.updateCanEndTurn(false);
        expect(service.canEndTurn()).toBeFalse();
    });

    it('should initialize values and set state to WaitingForAction if chosen player is active', () => {
        service.updateChosenPlayer(STANDARD_PLAYER);
        service.updateActivePlayer(STANDARD_PLAYER);

        service['initialized'].set(false);
        service.init();

        expect(service.nbOfActions()).toBe(INITIAL_AMOUNT_OF_ACTION);
        expect(service.nbOfEvasions()).toBe(INITIAL_AMOUNT_OF_EVASION);
        expect(service.canEndTurn()).toBeTrue();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(playerStateManagerSpy.changeState).toHaveBeenCalledWith(PlayerState.WaitingForAction, service.chosenPlayer());
    });

    it('should initialize and set state to WaitingForTurn if chosen player is not active', () => {
        service.updateChosenPlayer(STANDARD_PLAYER);
        service.updateActivePlayer(STANDARD_LIST_PLAYERS[0]);

        service['initialized'].set(false);
        service.init();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(playerStateManagerSpy.changeState).toHaveBeenCalledWith(PlayerState.WaitingForTurn, service.chosenPlayer());
    });

    it('should change state to Moving and call movementSystemManager.movePlayer if chosen player is active', () => {
        service.updateChosenPlayer(STANDARD_PLAYER);
        service.updateActivePlayer(STANDARD_PLAYER);
        service.updateGameId(STANDARD_GAME_CODE);

        service.movePlayer([{ x: 0, y: 0 }]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(playerStateManagerSpy.changeState).toHaveBeenCalledWith(PlayerState.Moving, STANDARD_PLAYER);
        expect(movementSystemManagerSpy.movePlayer).toHaveBeenCalledWith([{ x: 0, y: 0 }], STANDARD_GAME_CODE);
    });

    it('should not change state if chosen player is not active', () => {
        service.updateChosenPlayer(STANDARD_PLAYER);
        service.updateActivePlayer(STANDARD_LIST_PLAYERS[0]);
        service.updateGameId(STANDARD_GAME_CODE);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).playerState = () => {
            return PlayerState.WaitingForTurn;
        };

        service.movePlayer([{ x: 0, y: 0 }]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(playerStateManagerSpy.changeState).not.toHaveBeenCalled();
    });
    it('should call fightSystemManager.startAttack with position and gameId', () => {
        service.updateGameId(STANDARD_GAME_CODE);
        service.startAttack({ x: 2, y: 3 });
        expect(fightSystemManagerSpy.startAttack).toHaveBeenCalledWith({ x: 2, y: 3 }, STANDARD_GAME_CODE);
    });
    it('should not call fightSystemManager.startAttack with position and gameId if wrong state', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).playerState = () => {
            return PlayerState.Attacking;
        };
        service.updateGameId(STANDARD_GAME_CODE);
        service.startAttack({ x: 2, y: 3 });
        expect(fightSystemManagerSpy.startAttack).not.toHaveBeenCalled();
    });
    it('should not call fightSystemManager.startAttack with position and gameId if canStart is false', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).playerState = () => {
            return PlayerState.WaitingForAction;
        };
        service.updateCanStartFight(false);
        service.updateGameId(STANDARD_GAME_CODE);
        service.startAttack({ x: 2, y: 3 });
        expect(fightSystemManagerSpy.startAttack).not.toHaveBeenCalled();
    });
    it('should call movementSystemManager.toggleDoorState with position and gameId', () => {
        service.updateGameId(STANDARD_GAME_CODE);
        service.toggleDoorState({ x: 4, y: 4 });
        expect(movementSystemManagerSpy.toggleDoorState).toHaveBeenCalledWith({ x: 4, y: 4 }, STANDARD_GAME_CODE);
    });
    it('should not call movementSystemManager.toggleDoorState with position and gameId if wrong state', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).playerState = () => {
            return PlayerState.Attacking;
        };
        service.updateGameId(STANDARD_GAME_CODE);
        service.toggleDoorState({ x: 4, y: 4 });
        expect(movementSystemManagerSpy.toggleDoorState).not.toHaveBeenCalled();
    });
    it('should not call movementSystemManager.toggleDoorState with position and gameId if it cannot', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).playerState = () => {
            return PlayerState.WaitingForAction;
        };
        service.updateCanToggleDoor(false);
        service.updateGameId(STANDARD_GAME_CODE);
        service.toggleDoorState({ x: 4, y: 4 });
        expect(movementSystemManagerSpy.toggleDoorState).not.toHaveBeenCalled();
    });

    it('should call fightSystemManager.attackPlayer with gameId', () => {
        service.defendingPlayer().attributes.healthValue = 2;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).playerState = () => {
            return PlayerState.Attacking;
        };
        service.updateCanExecuteAttack(true);
        service.updateGameId(STANDARD_GAME_CODE);
        service.attackPlayer();
        expect(fightSystemManagerSpy.attackPlayer).toHaveBeenCalledWith(STANDARD_GAME_CODE);
    });
    it('should not call fightSystemManager.attackPlayer with gameId', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).playerState = () => {
            return PlayerState.WaitingForTurn;
        };
        service.updateGameId(STANDARD_GAME_CODE);
        service.attackPlayer();
        expect(fightSystemManagerSpy.attackPlayer).not.toHaveBeenCalled();
    });
    it('should not call fightSystemManager.attackPlayer with gameId if canAttack is false', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).playerState = () => {
            return PlayerState.Attacking;
        };
        service.updateCanExecuteAttack(false);
        service.updateGameId(STANDARD_GAME_CODE);
        service.attackPlayer();
        expect(fightSystemManagerSpy.attackPlayer).not.toHaveBeenCalled();
    });
    it('should not call fightSystemManager.attackPlayer with gameId if defending player health is 0', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).playerState = () => {
            return PlayerState.Attacking;
        };
        service.defendingPlayer().attributes.healthValue = 0;
        service.updateGameId(STANDARD_GAME_CODE);
        service.attackPlayer();
        expect(fightSystemManagerSpy.attackPlayer).not.toHaveBeenCalled();
    });

    it('should call fightSystemManager.attemptEscape with gameId', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).playerState = () => {
            return PlayerState.Attacking;
        };
        service.defendingPlayer().attributes.healthValue = 2;
        service.updateCanExecuteAttack(true);
        service.updateGameId(STANDARD_GAME_CODE);
        service.attemptEscape();
        expect(fightSystemManagerSpy.attemptEscape).toHaveBeenCalledWith(STANDARD_GAME_CODE);
    });
    it('should not call fightSystemManager.attemptEscape with gameId if wrong state', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).playerState = () => {
            return PlayerState.WaitingForTurn;
        };
        service.updateGameId(STANDARD_GAME_CODE);
        service.attemptEscape();
        expect(fightSystemManagerSpy.attemptEscape).not.toHaveBeenCalled();
    });
    it('should not call fightSystemManager.attemptEscape with gameId if wrong state', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).playerState = () => {
            return PlayerState.Attacking;
        };
        service.updateCanEscape(false);
        service.updateGameId(STANDARD_GAME_CODE);
        service.attemptEscape();
        expect(fightSystemManagerSpy.attemptEscape).not.toHaveBeenCalled();
    });
    it('should not call fightSystemManager.attemptEscape with gameId if defending player health is 0', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).playerState = () => {
            return PlayerState.Attacking;
        };
        service.defendingPlayer().attributes.healthValue = 0;
        service.updateGameId(STANDARD_GAME_CODE);
        service.attemptEscape();
        expect(fightSystemManagerSpy.attemptEscape).not.toHaveBeenCalled();
    });
    it('should send end turn event and set canEndTurn to false if canEndTurn is true', () => {
        service.updateGameId(STANDARD_GAME_CODE);
        service.updateCanEndTurn(true);

        service.endTurn();

        const data: dataForm.EndTurnReq = { gameCode: STANDARD_GAME_CODE };
        expect(socketClientServiceSpy.send).toHaveBeenCalledWith(SocketServerEventNames.EndTurn, data);
        expect(service.canEndTurn()).toBeFalse();
    });

    it('should not send event if canEndTurn is false', () => {
        service.updateCanEndTurn(false);
        service.endTurn();
        expect(socketClientServiceSpy.send).not.toHaveBeenCalled();
    });
    it('should not send end turn event if player state is not waiting for action', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).playerState = () => {
            return PlayerState.Attacking;
        };
        service.endTurn();
        expect(socketClientServiceSpy.send).not.toHaveBeenCalled();
    });
    it('should return true if turnClockValue is 0', () => {
        service.updateTurnClockValue(TURN_TIME_LIMIT_SEC);
        expect(service.shouldChangeTurn()).toBeTrue();
    });
    it('should return true if speedValue is 0 and no reachable nodes and no available action', () => {
        service.updateChosenPlayer(STANDARD_PLAYER);
        service.updateNbOfActions(INITIAL_AMOUNT_OF_ACTION);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (playerStateManagerSpy as any).reachableNodes = () => {
            return [];
        };
        service.updateNbOfActions(INITIAL_AMOUNT_OF_ACTION);
        expect(service.shouldChangeTurn()).toBeTrue();
    });
    it('should return false if player state is not waiting for action', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).playerState = () => {
            return PlayerState.Attacking;
        };
        expect(service.shouldChangeTurn()).toBeFalse();
    });

    it('should return true if speedValue is 0, no reachable nodes, and nbOfActions is 0', () => {
        service.updateChosenPlayer(STANDARD_PLAYER);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (playerStateManagerSpy as any).reachableNodes = () => {
            return [];
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (actionDetectorSpy as any).checkAvailableAction = () => {
            return true;
        };
        service.updateNbOfActions(0);

        expect(service.shouldChangeTurn()).toBeTrue();
    });

    it('should return false if player still can move', () => {
        service.updateChosenPlayer(STANDARD_PLAYER);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (playerStateManagerSpy as any).reachableNodes = () => {
            return [STANDARD_PLAYER];
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (actionDetectorSpy as any).checkAvailableAction = () => {
            return true;
        };
        service.updateNbOfActions(0);

        expect(service.shouldChangeTurn()).toBeFalse();
    });

    it('should deactivate action and change player state', () => {
        service.updateChosenPlayer(STANDARD_PLAYER);

        service.changeState(PlayerState.Moving);

        expect(actionDetectorSpy.deactivateAction).toHaveBeenCalled();
        expect(playerStateManagerSpy.changeState).toHaveBeenCalledWith(PlayerState.Moving, STANDARD_PLAYER);
    });

    it('should call actionDetector.setActionStatus with active player', () => {
        service.updateActivePlayer(STANDARD_PLAYER);
        service.setActionStatus();
        expect(actionDetectorSpy.setActionStatus).toHaveBeenCalledWith(STANDARD_PLAYER);
    });
    it('should call actionDetector.setActionStatus with active player', () => {
        service.updateActivePlayer(STANDARD_PLAYER);
        service.setActionStatus();
        expect(actionDetectorSpy.setActionStatus).toHaveBeenCalledWith(STANDARD_PLAYER);
    });
    it('should call actionDetector.deactivateAction', () => {
        service.deactivateAction();
        expect(actionDetectorSpy.deactivateAction).toHaveBeenCalled();
    });

    it('should call actionDetector.activateAction', () => {
        service.activateAction();
        expect(actionDetectorSpy.activateAction).toHaveBeenCalled();
    });

    it('should update chosen player if match found in list', () => {
        service.updateChosenPlayer(STANDARD_PLAYER);
        service.updateListOfPlayers([STANDARD_PLAYER]);

        const spy = spyOn(service, 'updateChosenPlayer');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).refreshChosenPlayer();

        expect(spy).toHaveBeenCalledWith(STANDARD_PLAYER);
    });

    it('should set chosen player to STANDARD_PLAYER if not found', () => {
        service.updateChosenPlayer(STANDARD_PLAYER);
        service.updateListOfPlayers([STANDARD_LIST_PLAYERS[0]]);

        const spy = spyOn(service, 'updateChosenPlayer');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).refreshChosenPlayer();

        expect(spy).toHaveBeenCalledWith(STANDARD_PLAYERS[0]);
    });
    it('should update players list, refresh chosen player, and update active player', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const refreshSpy = spyOn<any>(service, 'refreshChosenPlayer').and.callFake(() => {
            return;
        });
        const updateListSpy = spyOn(service, 'updateListOfPlayers').and.callThrough();
        const updateActiveSpy = spyOn(service, 'updateActivePlayer').and.callThrough();

        service.updatePlayersInfos(STANDARD_LIST_PLAYERS, STANDARD_PLAYER);

        expect(updateListSpy).toHaveBeenCalledWith(STANDARD_LIST_PLAYERS);
        expect(refreshSpy).toHaveBeenCalled();
        expect(updateActiveSpy).toHaveBeenCalledWith(STANDARD_PLAYER);
    });

    it('should expose leavingGame$ as readonly', () => {
        expect(service.leavingGame$()).toBeFalse();

        service.leaveGame();
        expect(service.leavingGame$()).toBeTrue();
    });

    it('should update eventHandlerSet', () => {
        service.updateEventHandlerSet(true);
        expect(service.eventHandlerSet()).toBeTrue();

        service.updateEventHandlerSet(false);
        expect(service.eventHandlerSet()).toBeFalse();
    });

    it('should set eventHandlerSet and initialized to false and disconnect socket if alive when leaveGame is called', () => {
        socketClientServiceSpy.isSocketAlive.and.returnValue(true);

        service.leaveGame();

        expect(service.eventHandlerSet()).toBeFalse();
        expect(service['initialized']()).toBeFalse();
        expect(socketClientServiceSpy.disconnect).toHaveBeenCalled();
        expect(service.leavingGame$()).toBeTrue();
    });

    it('should mark players as not in game if they are not in the new list', () => {
        const oldList = [STANDARD_PLAYERS[0], STANDARD_PLAYERS[1]];
        const newList = [STANDARD_PLAYERS[0]];

        service.updateDisplayedList(oldList);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).updateDisplayedPlayerList(newList);

        const updatedList = service.displayedPlayerList();
        expect(updatedList[1].isNotInGame).toBeTrue();
    });

    it('should initialize chosenPlayer with the first standard player', () => {
        const expectedPlayer = {
            ...STANDARD_PLAYERS[0],
            victories: STANDARD_PLAYERS[0].victories ?? 0,
        };
        expect(service.chosenPlayer()).toEqual(expectedPlayer);
    });
    it('should initialize chosenPlayer with 0 victory if victories is undefined', () => {
        const expectedPlayer = {
            ...STANDARD_PLAYERS[0],
            victories: STANDARD_LIST_PLAYERS[3].victories ?? 0,
        };
        expect(service.chosenPlayer().victories).toEqual(expectedPlayer.victories);
        expect(expectedPlayer.victories).toEqual(0);
    });

    it('should initialize listOfPlayers with standard players', () => {
        const expectedPlayers = STANDARD_PLAYERS.map((player: Player) => ({
            ...player,
            victories: player.victories ?? 0,
        }));
        expect(service.listOfPlayers()).toEqual(expectedPlayers);
    });

    it('should initialize activePlayer with the first standard player', () => {
        const expectedPlayer = {
            ...STANDARD_PLAYERS[0],
            victories: STANDARD_PLAYERS[0].victories ?? 0,
        };
        expect(service.activePlayer()).toEqual(expectedPlayer);
    });
    it('should do nothing if chosenPlayer is not organizer', () => {
        const player = STANDARD_PLAYER;
        service.updateChosenPlayer(player);
        player.organizer = false;

        service.toggleDebugMode();

        expect(actionDetectorSpy.deactivateAction).not.toHaveBeenCalled();
        expect(socketClientServiceSpy.send).not.toHaveBeenCalled();
    });

    it('should do nothing if canToggleDebugMode is false', () => {
        const player = STANDARD_PLAYER;
        player.organizer = true;
        service.updateChosenPlayer(player);
        service.updateCanToggleDebugMode(false);
        service.toggleDebugMode();

        expect(actionDetectorSpy.deactivateAction).not.toHaveBeenCalled();
        expect(socketClientServiceSpy.send).not.toHaveBeenCalled();
    });

    it('should update updateChangeDisplayAttackClock to false', () => {
        const player = STANDARD_PLAYER;
        player.organizer = true;
        service.updateChangeDisplayAttackClock(false);
        service.updateChosenPlayer(player);

        expect(service.changeDisplayAttackClock()).toEqual(false);
    });

    it('should update updateLargestAmountOfEscape to a new value', () => {
        service.updateLargestAmountOfEscape(0);
        const player = STANDARD_PLAYER;
        expect(service.largestAmountOfEscape()).toEqual(0);

        service.updateLargestAmountOfEscape(1);
        service.updateChosenPlayer(player);

        expect(service.largestAmountOfEscape()).toEqual(1);
    });

    it('should deactivate action and send socket event if canToggleDudugMode', () => {
        const player = STANDARD_PLAYER;
        service.updateChosenPlayer(player);
        player.organizer = true;
        service.updateCanToggleDebugMode(true);

        service.toggleDebugMode();

        expect(actionDetectorSpy.deactivateAction).toHaveBeenCalled();
        expect(socketClientServiceSpy.send).toHaveBeenCalledWith(SocketServerEventNames.ToggleDebugMode, { gameCode: service.gameId() });
    });
    it('should deactivate action and send socket event if organizer', () => {
        const player = STANDARD_PLAYER;
        service.updateChosenPlayer(player);
        player.organizer = true;

        service.toggleDebugMode();

        expect(actionDetectorSpy.deactivateAction).toHaveBeenCalled();
        expect(socketClientServiceSpy.send).toHaveBeenCalledWith(SocketServerEventNames.ToggleDebugMode, { gameCode: service.gameId() });
    });
    it('should update debugModeStatus with new value', () => {
        service.updateDebugMode(true);
        expect(service.debugModeStatus()).toBe(true);
    });
    it('should not teleport if debugModeStatus is false', () => {
        service.updateDebugMode(false);
        service.teleportPlayer({ x: 1, y: 1 });

        expect(movementSystemManagerSpy.teleportPlayer).not.toHaveBeenCalled();
    });

    it('should not teleport if chosenPlayer is not activePlayer', () => {
        service.updateDebugMode(true);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).playerState = () => {
            return PlayerState.WaitingForAction;
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).chosenPlayer = () => {
            return STANDARD_PLAYER;
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).chosenPlayer = () => {
            return STANDARD_PLAYERS[2];
        };

        service.teleportPlayer({ x: 1, y: 1 });

        expect(movementSystemManagerSpy.teleportPlayer).not.toHaveBeenCalled();
    });
    it('should not teleport if playerState is not WaitingForAction', () => {
        service.updateDebugMode(true);
        service.updateChosenPlayer(STANDARD_PLAYER);
        service.updateActivePlayer(STANDARD_PLAYERS[2]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).playerState = () => {
            return PlayerState.Attacking;
        };

        service.teleportPlayer({ x: 1, y: 1 });

        expect(movementSystemManagerSpy.teleportPlayer).not.toHaveBeenCalled();
    });

    it('should not teleport if tile is a closed door', () => {
        service.updateDebugMode(true);
        const player = STANDARD_PLAYER;
        service.updateChosenPlayer(player);
        service.updateActivePlayer(player);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).playerState = () => {
            return PlayerState.WaitingForAction;
        };
        service.updateGameId(STANDARD_GAME_CODE);

        const mockTile = {
            type: TileType.Door,
            doorState: false,
            containedItem: undefined,
            containedPlayer: undefined,
        };

        standardBoard.tiles = [[mockTile]];

        const newPosition = { x: 0, y: 0 };
        player.position = newPosition;
        service.teleportPlayer(newPosition);

        expect(movementSystemManagerSpy.teleportPlayer).not.toHaveBeenCalled();
    });

    it('should not teleport if tile is a wall', () => {
        service.updateDebugMode(true);
        const player = STANDARD_PLAYER;
        service.updateChosenPlayer(player);
        service.updateActivePlayer(player);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).playerState = () => {
            return PlayerState.WaitingForAction;
        };
        service.updateGameId(STANDARD_GAME_CODE);

        const mockTile = {
            type: TileType.Wall,
            doorState: false,
            containedItem: undefined,
            containedPlayer: undefined,
        };

        standardBoard.tiles = [[mockTile]];

        const newPosition = { x: 0, y: 0 };
        player.position = newPosition;
        service.teleportPlayer(newPosition);

        expect(movementSystemManagerSpy.teleportPlayer).not.toHaveBeenCalled();
    });

    it('should not teleport player if position is undefined', () => {
        service.updateDebugMode(true);
        const player = STANDARD_PLAYER;
        service.updateChosenPlayer(player);
        service.updateActivePlayer(player);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).playerState = () => {
            return PlayerState.WaitingForAction;
        };
        service.updateGameId(STANDARD_GAME_CODE);
        standardBoard.tiles = [
            [
                {
                    type: TileType.Grass,
                },
            ],
        ];

        const newPosition = { x: 0, y: 0 };
        player.position = undefined;
        service.teleportPlayer(newPosition);

        expect(movementSystemManagerSpy.teleportPlayer).toHaveBeenCalledWith({ x: 0, y: 0 }, newPosition, service.gameId());
    });
    it('should not teleport if canTeleport is false', () => {
        service.updateDebugMode(true);
        const player = STANDARD_PLAYER;
        service.updateChosenPlayer(player);
        service.updateActivePlayer(player);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).playerState = () => {
            return PlayerState.WaitingForAction;
        };
        service.updateGameId(STANDARD_GAME_CODE);
        standardBoard.tiles = [
            [
                {
                    type: TileType.Grass,
                    containedItem: {
                        type: FROM_ITEM_NAME_TO_TYPE[ITEM_NAMES.startingPoint],
                        name: ITEM_NAMES.attributeEditor1,
                        description: FROM_ITEM_NAME_TO_DESCRIPTION[ITEM_NAMES.attributeEditor1],
                    },
                },
            ],
        ];
        service.updateCanTelePort(false);
        service.teleportPlayer({ x: 0, y: 0 });

        expect(movementSystemManagerSpy.teleportPlayer).not.toHaveBeenCalled();
    });

    it('should teleport player if all conditions are met', () => {
        service.updateDebugMode(true);
        const player = STANDARD_PLAYER;
        service.updateChosenPlayer(player);
        service.updateActivePlayer(player);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).playerState = () => {
            return PlayerState.WaitingForAction;
        };
        service.updateGameId(STANDARD_GAME_CODE);
        standardBoard.tiles = [
            [
                {
                    type: TileType.Grass,
                    containedItem: undefined,
                    containedPlayer: undefined,
                },
            ],
        ];

        service.updateCanTelePort(true);

        const newPosition = { x: 0, y: 0 };
        player.position = newPosition;
        service.teleportPlayer(newPosition);

        expect(movementSystemManagerSpy.teleportPlayer).toHaveBeenCalledWith({ x: 0, y: 0 }, newPosition, service.gameId());
        expect(service.canTeleport()).toEqual(false);
    });
    it('should not teleport player if it cannot', () => {
        service.updateDebugMode(false);
        const player = STANDARD_PLAYER;
        service.updateChosenPlayer(player);
        service.updateActivePlayer(player);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).playerState = () => {
            return PlayerState.WaitingForAction;
        };
        service.updateCanTelePort(false);
        service.updateGameId(STANDARD_GAME_CODE);
        standardBoard.tiles = [
            [
                {
                    type: TileType.Grass,
                    containedItem: {
                        type: FROM_ITEM_NAME_TO_TYPE[ITEM_NAMES.startingPoint],
                        name: ITEM_NAMES.attributeEditor1,
                        description: FROM_ITEM_NAME_TO_DESCRIPTION[ITEM_NAMES.attributeEditor1],
                    },
                },
            ],
        ];

        const newPosition = { x: 0, y: 0 };
        player.position = newPosition;
        service.teleportPlayer(newPosition);

        expect(movementSystemManagerSpy.teleportPlayer).not.toHaveBeenCalled();
    });
    it('should not teleport if item is  found', () => {
        service.updateDebugMode(true);
        service.updateChosenPlayer(STANDARD_PLAYER);
        service.updateActivePlayer(STANDARD_PLAYERS[2]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).playerState = () => {
            return PlayerState.WaitingForAction;
        };
        standardBoard.tiles = [
            [
                {
                    type: TileType.Grass,
                    containedItem: {
                        type: FROM_ITEM_NAME_TO_TYPE[ITEM_NAMES.attributeEditor1],
                        name: ITEM_NAMES.attributeEditor1,
                        description: FROM_ITEM_NAME_TO_DESCRIPTION[ITEM_NAMES.attributeEditor1],
                    },
                },
            ],
        ];
        service.teleportPlayer({ x: 0, y: 0 });

        expect(movementSystemManagerSpy.teleportPlayer).not.toHaveBeenCalled();
    });
    it('should not teleport if player is  found', () => {
        service.updateDebugMode(true);
        service.updateChosenPlayer(STANDARD_PLAYER);
        service.updateActivePlayer(STANDARD_PLAYERS[2]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).playerState = () => {
            return PlayerState.WaitingForAction;
        };
        standardBoard.tiles = [
            [
                {
                    type: TileType.Grass,
                    containedPlayer: {} as Player,
                },
            ],
        ];
        service.teleportPlayer({ x: 0, y: 0 });

        expect(movementSystemManagerSpy.teleportPlayer).not.toHaveBeenCalled();
    });

    it('should update fight clock value', () => {
        service.updateFightClockValue(0);
        expect(service.fightClockValue()).toBe(0);
    });

    it('should update turn clock value', () => {
        service.updateTurnClockValue(0);
        expect(service.turnClockValue()).toBe(0);
    });
    it('should initialize chosenPlayer with victories property', () => {
        const player = service.chosenPlayer();
        expect(player.victories).toBeDefined();
        expect(player.victories).toBe(STANDARD_PLAYERS[0].victories ?? 0);
        expect(player).toEqual({
            ...STANDARD_PLAYERS[0],
            victories: STANDARD_PLAYERS[0].victories ?? 0,
        });
    });

    it('should initialize listOfPlayers with victories property for each player', () => {
        const players = service.listOfPlayers();
        expect(players.length).toBe(STANDARD_PLAYERS.length);
        players.forEach((player, index) => {
            expect(player.victories).toBeDefined();
            expect(player.victories).toBe(STANDARD_PLAYERS[index].victories ?? 0);
            expect(player).toEqual({
                ...STANDARD_PLAYERS[index],
                victories: STANDARD_PLAYERS[index].victories ?? 0,
            });
        });
    });

    it('should initialize activePlayer with victories property', () => {
        const player = service.activePlayer();
        expect(player.victories).toBeDefined();
        expect(player.victories).toBe(STANDARD_PLAYERS[0].victories ?? 0);
        expect(player).toEqual({
            ...STANDARD_PLAYERS[0],
            victories: STANDARD_PLAYERS[0].victories ?? 0,
        });
    });

    it('should handle undefined victories in STANDARD_PLAYERS', () => {
        (STANDARD_PLAYERS as Player[])[0] = {
            ...STANDARD_PLAYERS[0],
            victories: undefined,
        };

        service = TestBed.inject(GameSessionManagerService);

        const player = service.chosenPlayer();
        expect(player.victories).toBe(0);
    });
    it('should update the showDropItemInterface signal with the new value', () => {
        service.updateShowDropItemInterface(true);
        expect(service.showDropItemInterface()).toBeTrue();

        service.updateShowDropItemInterface(false);
        expect(service.showDropItemInterface()).toBeFalse();
    });
    it('should update the canDropItem signal with the new value', () => {
        service.updateCanDropItem(true);
        expect(service.canDropItem()).toBeTrue();

        service.updateCanDropItem(false);
        expect(service.canDropItem()).toBeFalse();
    });

    it('should update the canPickUpItem signal with the new value', () => {
        service.updateCanPickUpItem(true);
        expect(service.canPickUpItem()).toBeTrue();

        service.updateCanPickUpItem(false);
        expect(service.canPickUpItem()).toBeFalse();
    });
    it('should return false if no item is present at the position', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (boardGameManagerSpy as any).playingBoardGame = () => {
            return {
                tiles: [[{ containedItem: undefined as unknown as Item } as unknown as Tile]],
            } as unknown as BoardGame;
        };

        const position: Position = { x: 0, y: 0 };
        expect(service.validItemPresent(position)).toBeFalse();
    });

    it('should return false if the item is a StartingPoint or RandomItem', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (boardGameManagerSpy as any).playingBoardGame = () => {
            return {
                tiles: [[{ containedItem: { type: ItemType.StartingPoint } as unknown as Item } as unknown as Tile]],
            } as unknown as BoardGame;
        };
        const position: Position = { x: 0, y: 0 };
        expect(service.validItemPresent(position)).toBeFalse();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (boardGameManagerSpy as any).playingBoardGame = () => {
            return {
                tiles: [[{ containedItem: { type: ItemType.RandomItem } as unknown as Item } as unknown as Tile]],
            } as unknown as BoardGame;
        };

        expect(service.validItemPresent(position)).toBeFalse();
    });

    it('should return true if a valid item is present', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (boardGameManagerSpy as any).playingBoardGame = () => {
            return {
                tiles: [[{ containedItem: { type: ItemType.ConditionBased } as unknown as Item } as unknown as Tile]],
            } as unknown as BoardGame;
        };
        const position: Position = { x: 0, y: 0 };
        expect(service.validItemPresent(position)).toBeTrue();
    });
    it('should send a PickUpItem request if conditions are met', () => {
        service.changeState(PlayerState.Moving);
        service.updateCanPickUpItem(true);
        service.updateGameId('game123');
        service.updateChosenPlayer(STANDARD_PLAYER);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).playerState = () => {
            return PlayerState.Moving;
        };

        service.pickUpItem();

        expect(socketClientServiceSpy.send).toHaveBeenCalledWith(SocketServerEventNames.PickUpItem, {
            gameCode: 'game123',
            player: STANDARD_PLAYER,
        });
        expect(service.canPickUpItem()).toBeFalse();
    });

    it('should not send a PickUpItem request if playerState is not Moving', () => {
        service.changeState(PlayerState.WaitingForAction);

        service.pickUpItem();

        expect(socketClientServiceSpy.send).not.toHaveBeenCalled();
    });

    it('should not send a PickUpItem request if canPickUpItem is false', () => {
        service.changeState(PlayerState.Moving);
        service.updateCanPickUpItem(false);
        spyOn(service.canPickUpItem, 'set');
        service.pickUpItem();
        expect(socketClientServiceSpy.send).not.toHaveBeenCalled();
        expect(service.canPickUpItem.set).not.toHaveBeenCalled();
    });

    it('should not send a DropItem request if playerState is not DroppingItem', () => {
        spyOn(service, 'playerState').and.returnValue(PlayerState.WaitingForAction);

        const item: Item = { name: 'Sword', type: ItemType.RandomItem } as Item;
        service.dropItem(item);

        expect(socketClientServiceSpy.send).not.toHaveBeenCalled();
    });

    it('should not send a DropItem request if canDropItem is false', () => {
        spyOn(service, 'playerState').and.returnValue(PlayerState.DroppingItem);
        spyOn(service, 'canDropItem').and.returnValue(false);

        const item: Item = { name: 'Sword', type: ItemType.ConditionBased } as Item;
        service.dropItem(item);

        expect(socketClientServiceSpy.send).not.toHaveBeenCalled();
    });
    it('should send a DropItem request if conditions are met', () => {
        service.changeState(PlayerState.DroppingItem);
        service.updateCanDropItem(true);
        service.updateGameId('game123');
        service.updateChosenPlayer(STANDARD_PLAYER);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).playerState = () => {
            return PlayerState.DroppingItem;
        };

        const item: Item = { name: 'Sword', type: ItemType.ConditionBased } as Item;
        service.dropItem(item);

        expect(socketClientServiceSpy.send).toHaveBeenCalledWith(SocketServerEventNames.DropItem, {
            gameCode: 'game123',
            player: STANDARD_PLAYER,
            item,
        });
        expect(service.canDropItem()).toBeFalse();
    });

    it('should not pick up item if canPickUpItem is false', () => {
        service.changeState(PlayerState.Moving);
        service.updateCanPickUpItem(false);
        service.updateGameId('game123');
        service.updateChosenPlayer(STANDARD_PLAYER);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).playerState = () => {
            return PlayerState.Moving;
        };

        service.pickUpItem();

        expect(socketClientServiceSpy.send).not.toHaveBeenCalled();
        expect(service.canPickUpItem()).toBeFalse();
    });
});

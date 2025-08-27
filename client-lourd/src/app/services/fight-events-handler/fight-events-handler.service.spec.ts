import { TestBed } from '@angular/core/testing';
import { provideRouter, Routes } from '@angular/router';
import { SocketTestHelper } from '@app/classes/socket-test-helper/socket-test-helper';
import { INITIAL_AMOUNT_OF_EVASION, STANDARD_LIST_PLAYERS, STANDARD_PLAYER, STANDARD_PLAYERS } from '@app/constants/development-constants';
import { FROM_ITEM_NAME_TO_DESCRIPTION, ITEM_NAMES } from '@app/constants/objects-constants';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { GameInterfaceService } from '@app/services/game-interface/game-interface.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { GameSocketEventService } from '@app/services/game-socket-event/game-socket-event.service';
import { BoardGame } from '@common/board-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { GameMode } from '@common/enums/game-mode';
import { ItemType } from '@common/enums/item-type';
import { PlayerState } from '@common/enums/player-state';
import { SocketClientEventNames } from '@common/enums/socket-events-names';
import { TileType } from '@common/enums/tile-type';
import { Player } from '@common/player';
import * as dataForm from '@common/socket-data-forms';
import { Subject } from 'rxjs';
import { Socket } from 'socket.io-client';
import { FightEventsHandlerService } from './fight-events-handler.service';

class SocketClientServiceMock extends SocketClientService {
    override connect() {
        return;
    }
}

const routes: Routes = [];

describe('FightEventsHandlerService', () => {
    let service: FightEventsHandlerService;
    let socketServiceMock: SocketClientServiceMock;
    let socketHelper: SocketTestHelper;
    let gameSessionManagerSpy: jasmine.SpyObj<GameSessionManagerService>;
    let standardBoard: BoardGame;

    beforeEach(() => {
        socketHelper = new SocketTestHelper();
        socketServiceMock = new SocketClientServiceMock();
        socketServiceMock.socket = socketHelper as unknown as Socket;

        const leavingGameSubject = new Subject<void>();
        gameSessionManagerSpy = jasmine.createSpyObj(
            'GameSessionManagerService',
            [
                'updatePlayersInfos',
                'gameId',
                'canEndTurn',
                'updateChosenPlayer',
                'updateBoardGame',
                'changeState',
                'shouldChangeTurn',
                'endTurn',
                'updateAttackingPlayer',
                'updateDefendingPlayer',
                'updateNbOfEvasions',
                'updateCanTelePort',
                'updateCanStartFight',
                'updateCanExecuteAttack',
                'updateCanEscape',
                'updateCanToggleDoor',
                'playerState',
                'updateLargestAmountOfEscape',
                'updateChangeDisplayAttackClock',
                'updateFightClockValue',
            ],
            {
                leavingGame$: leavingGameSubject.asObservable(),
            },
        );

        const gameInterfaceServiceSpy = jasmine.createSpyObj('GameInterfaceService', ['hideInterface', 'showInterface', 'hideEscapeConfirmation']);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).chosenPlayer = () => STANDARD_PLAYER;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).activePlayer = () => STANDARD_PLAYER;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).attackingPlayer = () => STANDARD_PLAYER;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).defendingPlayer = () => STANDARD_PLAYER;

        const gameSocketEventServiceMock = jasmine.createSpyObj('GameSocketEventService', ['configureBaseSocket']);
        TestBed.configureTestingModule({
            providers: [
                { provide: SocketClientService, useValue: socketServiceMock },
                { provide: GameSessionManagerService, useValue: gameSessionManagerSpy },
                { provide: GameInterfaceService, useValue: gameInterfaceServiceSpy },
                { provide: GameSocketEventService, useValue: gameSocketEventServiceMock },
                FightEventsHandlerService,
                provideRouter(routes),
            ],
        });

        socketServiceMock.connect();
        service = TestBed.inject(FightEventsHandlerService);

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
        expect(service).toBeTruthy();
    });

    it('should update the players infos, the attacking player and the defending players when starting a fight', () => {
        const ans: dataForm.StartFightRes = {
            successful: true,
            message: '',
            activePlayer: STANDARD_PLAYER,
            listOfPlayers: STANDARD_LIST_PLAYERS,
            boardGame: standardBoard,
            defendingPlayer: STANDARD_PLAYER,
            attackingPlayer: STANDARD_PLAYER,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).chosenPlayer = () => STANDARD_LIST_PLAYERS[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).activePlayer = () => STANDARD_LIST_PLAYERS[0];

        socketHelper.peerSideEmit(SocketClientEventNames.StartFight, ans);
        expect(gameSessionManagerSpy.updatePlayersInfos).toHaveBeenCalledWith(ans.listOfPlayers, ans.activePlayer);
        expect(gameSessionManagerSpy.updateAttackingPlayer).toHaveBeenCalledWith(ans.attackingPlayer);
        expect(gameSessionManagerSpy.updateDefendingPlayer).toHaveBeenCalledWith(ans.defendingPlayer);

        expect(gameSessionManagerSpy.changeState).toHaveBeenCalledWith(PlayerState.SpectatingFight);
    });

    it('should change the state the state of the player to attacking or defending if he is in the fight', () => {
        const ans: dataForm.StartFightRes = {
            successful: true,
            message: '',
            activePlayer: STANDARD_PLAYER,
            listOfPlayers: STANDARD_LIST_PLAYERS,
            boardGame: standardBoard,
            defendingPlayer: STANDARD_PLAYER,
            attackingPlayer: STANDARD_PLAYER,
        };
        socketHelper.peerSideEmit(SocketClientEventNames.StartFight, ans);

        expect(gameSessionManagerSpy.changeState).toHaveBeenCalledWith(PlayerState.Attacking);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).attackingPlayer = () => STANDARD_LIST_PLAYERS[0];

        socketHelper.peerSideEmit(SocketClientEventNames.StartFight, ans);

        expect(gameSessionManagerSpy.changeState).toHaveBeenCalledWith(PlayerState.Defending);
    });

    it('should reset state when unsuccessful and in Attacking state', () => {
        const ans: dataForm.StartFightRes = {
            successful: false,
            message: '',
            activePlayer: STANDARD_PLAYER,
            listOfPlayers: STANDARD_LIST_PLAYERS,
            boardGame: standardBoard,
            defendingPlayer: STANDARD_PLAYER,
            attackingPlayer: STANDARD_PLAYER,
        };

        gameSessionManagerSpy.playerState.and.returnValue(PlayerState.Attacking);
        service.configureBaseSocket();
        socketHelper.peerSideEmit(SocketClientEventNames.StartFight, ans);
        expect(gameSessionManagerSpy.updateCanStartFight).toHaveBeenCalledWith(true);
        expect(gameSessionManagerSpy.changeState).toHaveBeenCalledWith(PlayerState.WaitingForAction);
    });

    it('should update players information if an Attack has been executed', () => {
        const ans: dataForm.ExecuteAttackRes = {
            successful: true,
            message: '',
            boardGame: standardBoard,
            listOfPlayers: STANDARD_LIST_PLAYERS,
            activePlayer: STANDARD_PLAYER,
            attackingPlayer: STANDARD_PLAYER,
            defendingPlayer: STANDARD_PLAYER,
            damageDoneAttackingPlayer: 5,
            damageTakenDefendingPlayer: 4,
        };

        socketHelper.peerSideEmit(SocketClientEventNames.ProcessAttack, ans);

        expect(gameSessionManagerSpy.updatePlayersInfos).toHaveBeenCalledWith(ans.listOfPlayers, ans.activePlayer);
        expect(gameSessionManagerSpy.updateAttackingPlayer).toHaveBeenCalledWith(ans.attackingPlayer);
        expect(gameSessionManagerSpy.updateDefendingPlayer).toHaveBeenCalledWith(ans.defendingPlayer);
    });

    it('should update players information if a turn switch has happened', () => {
        const ans: dataForm.SwitchTurn = {
            successful: true,
            message: '',
            boardGame: standardBoard,
            listOfPlayers: STANDARD_LIST_PLAYERS,
            activePlayer: STANDARD_PLAYER,
            attackingPlayer: STANDARD_PLAYER,
            defendingPlayer: STANDARD_PLAYER,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).chosenPlayer = () => STANDARD_LIST_PLAYERS[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).activePlayer = () => STANDARD_LIST_PLAYERS[0];

        socketHelper.peerSideEmit(SocketClientEventNames.SwitchTurn, ans);

        expect(gameSessionManagerSpy.updatePlayersInfos).toHaveBeenCalledWith(ans.listOfPlayers, ans.activePlayer);
        expect(gameSessionManagerSpy.updateAttackingPlayer).toHaveBeenCalledWith(ans.attackingPlayer);
        expect(gameSessionManagerSpy.updateDefendingPlayer).toHaveBeenCalledWith(ans.defendingPlayer);

        expect(gameSessionManagerSpy.changeState).toHaveBeenCalledWith(PlayerState.SpectatingFight);
    });

    it("should make sure that each fighters has it's correct state", () => {
        const ans: dataForm.SwitchTurn = {
            successful: true,
            message: '',
            activePlayer: STANDARD_PLAYER,
            listOfPlayers: STANDARD_LIST_PLAYERS,
            boardGame: standardBoard,
            defendingPlayer: STANDARD_PLAYER,
            attackingPlayer: STANDARD_PLAYER,
        };
        socketHelper.peerSideEmit(SocketClientEventNames.SwitchTurn, ans);

        expect(gameSessionManagerSpy.changeState).toHaveBeenCalledWith(PlayerState.Attacking);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).attackingPlayer = () => STANDARD_LIST_PLAYERS[0];

        socketHelper.peerSideEmit(SocketClientEventNames.SwitchTurn, ans);

        expect(gameSessionManagerSpy.changeState).toHaveBeenCalledWith(PlayerState.Defending);
    });

    it('should keep the game information consistent and reset the fight information at the end of a combat', () => {
        const ans: dataForm.EndFightRes = {
            successful: true,
            message: '',
            activePlayer: STANDARD_PLAYER,
            listOfPlayers: STANDARD_LIST_PLAYERS,
            boardGame: standardBoard,
            winnerName: STANDARD_LIST_PLAYERS[0].name,
            loserName: STANDARD_LIST_PLAYERS[0].name,
            attackingPlayer: { victories: 1 } as Player,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).activePlayer = () => STANDARD_LIST_PLAYERS[0];
        socketHelper.peerSideEmit(SocketClientEventNames.EndFight, ans);

        expect(gameSessionManagerSpy.updateNbOfEvasions).toHaveBeenCalledWith(INITIAL_AMOUNT_OF_EVASION);
        expect(gameSessionManagerSpy.updatePlayersInfos).toHaveBeenCalledWith(ans.listOfPlayers, ans.activePlayer);
        expect(gameSessionManagerSpy.updateAttackingPlayer).toHaveBeenCalledWith(STANDARD_PLAYERS[0]);
        expect(gameSessionManagerSpy.updateDefendingPlayer).toHaveBeenCalledWith(STANDARD_PLAYERS[0]);
        expect(gameSessionManagerSpy.changeState).toHaveBeenCalledWith(PlayerState.WaitingForTurn);
    });

    it('should end player turn if the active player has lost', () => {
        const ans: dataForm.EndFightRes = {
            successful: true,
            message: '',
            activePlayer: STANDARD_PLAYER,
            listOfPlayers: STANDARD_LIST_PLAYERS,
            boardGame: standardBoard,
            winnerName: STANDARD_PLAYER.name,
            loserName: STANDARD_PLAYER.name,
            attackingPlayer: { victories: 1 } as Player,
        };

        socketHelper.peerSideEmit(SocketClientEventNames.EndFight, ans);
        expect(gameSessionManagerSpy.endTurn).toHaveBeenCalled();
    });

    it('should end player turn if the other requirement are met', () => {
        const ans: dataForm.EndFightRes = {
            successful: true,
            message: '',
            activePlayer: STANDARD_PLAYER,
            listOfPlayers: STANDARD_LIST_PLAYERS,
            boardGame: standardBoard,
            winnerName: STANDARD_PLAYER.name,
            loserName: STANDARD_PLAYER.name,
            attackingPlayer: { victories: undefined } as Player,
        };

        gameSessionManagerSpy.shouldChangeTurn.and.returnValue(true);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).chosenPlayer = () => STANDARD_LIST_PLAYERS[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).activePlayer = () => STANDARD_LIST_PLAYERS[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).defendingPlayer = () => STANDARD_LIST_PLAYERS[0];

        socketHelper.peerSideEmit(SocketClientEventNames.EndFight, ans);
        expect(gameSessionManagerSpy.endTurn).toHaveBeenCalled();
    });

    it('should not do anything if the server yields an error', () => {
        const ans = {
            successful: false,
            message: '',
        };
        socketHelper.peerSideEmit(SocketClientEventNames.EndFight, ans);
        socketHelper.peerSideEmit(SocketClientEventNames.StartFight, ans);
        socketHelper.peerSideEmit(SocketClientEventNames.SwitchTurn, ans);
        socketHelper.peerSideEmit(SocketClientEventNames.ProcessEscapeAttempt, ans);
        socketHelper.peerSideEmit(SocketClientEventNames.ProcessAttack, ans);

        expect(gameSessionManagerSpy.updatePlayersInfos).not.toHaveBeenCalled();
        expect(gameSessionManagerSpy.shouldChangeTurn).not.toHaveBeenCalled();
    });

    it('should hide the interface when a player has successfully escaped', () => {
        const gameInterfaceServiceSpy = TestBed.inject(GameInterfaceService) as jasmine.SpyObj<GameInterfaceService>;

        const ans: dataForm.EscapeAttemptRes = {
            successful: true,
            message: 'escaped',
            escapingPlayer: STANDARD_PLAYER,
        };

        socketHelper.peerSideEmit(SocketClientEventNames.ProcessEscapeAttempt, ans);

        expect(gameInterfaceServiceSpy.hideInterface).toHaveBeenCalled();
    });

    it('should not hide the interface when a player fails to escape', () => {
        const gameInterfaceServiceSpy = TestBed.inject(GameInterfaceService) as jasmine.SpyObj<GameInterfaceService>;

        gameInterfaceServiceSpy.hideInterface.calls.reset();

        const ans: dataForm.EscapeAttemptRes = {
            successful: true,
            message: 'Player failed to escape',
        };

        socketHelper.peerSideEmit(SocketClientEventNames.ProcessEscapeAttempt, ans);

        expect(gameInterfaceServiceSpy.hideInterface).not.toHaveBeenCalled();
    });

    it('should end player turn if the active player has lost (with undefined loserName)', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).chosenPlayer = () => STANDARD_LIST_PLAYERS[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).activePlayer = () => STANDARD_LIST_PLAYERS[0];

        const ans: dataForm.EndFightRes = {
            successful: true,
            message: '',
            activePlayer: STANDARD_PLAYER,
            listOfPlayers: STANDARD_LIST_PLAYERS,
            boardGame: standardBoard,
            winnerName: STANDARD_PLAYER.name,
            attackingPlayer: { victories: 1 } as Player,
        };

        socketHelper.peerSideEmit(SocketClientEventNames.EndFight, ans);
        expect(gameSessionManagerSpy.endTurn).toHaveBeenCalled();
    });
    it('should end game if amount of victories reached', () => {
        Object.defineProperty(gameSessionManagerSpy, 'gameMode', {
            get: () => GameMode.Normal,
            configurable: true,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).chosenPlayer = () => STANDARD_LIST_PLAYERS[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gameSessionManagerSpy as any).activePlayer = () => STANDARD_LIST_PLAYERS[0];

        const ans: dataForm.EndFightRes = {
            successful: true,
            message: '',
            activePlayer: STANDARD_PLAYER,
            listOfPlayers: STANDARD_LIST_PLAYERS,
            boardGame: standardBoard,
            winnerName: STANDARD_PLAYER.name,
            attackingPlayer: {
                ...STANDARD_PLAYER,
                victories: 3,
            } as Player,
        };

        socketHelper.peerSideEmit(SocketClientEventNames.EndFight, ans);
        expect(gameSessionManagerSpy.changeState).toHaveBeenCalledWith(PlayerState.EndGame);
    });
});

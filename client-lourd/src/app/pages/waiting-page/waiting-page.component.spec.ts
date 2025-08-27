import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { CurrentGameManagerService } from '@app/services/current-game-manager/current-game-manager.service';
import { GameEventService } from '@app/services/game-event/game-event.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { BoardGame } from '@common/board-game';
import { CurrentGame } from '@common/current-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { DiceBonus } from '@common/enums/dice-bonus';
import { GameMode } from '@common/enums/game-mode';
import { PlayerLimits } from '@common/enums/players-limit';
import { SocketClientEventNames } from '@common/enums/socket-events-names';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import { GameEventType } from '@common/enums/game-event-type';
import { GameEvent } from '@common/game-event';
import { Player } from '@common/player';
import * as socketDataForm from '@common/socket-data-forms';
import { WaitingPageComponent } from './waiting-page.component';

describe('WaitingPageComponent', () => {
    let component: WaitingPageComponent;
    let fixture: ComponentFixture<WaitingPageComponent>;
    let mockRouter: Router;
    let mockSocketClientService: jasmine.SpyObj<SocketClientService>;
    let mockCurrentGameManager: jasmine.SpyObj<CurrentGameManagerService>;
    let mockGameSessionManager: jasmine.SpyObj<GameSessionManagerService>;
    let mockPlayerSocketService: jasmine.SpyObj<PlayerSocketService>;
    let mockGameEventService: jasmine.SpyObj<GameEventService>;

    const boardGame: BoardGame = {
        id: 'bg1',
        name: 'Test Game',
        description: 'A test game',
        size: BoardGameSize.Small,
        gameMode: GameMode.Normal,
        tiles: [],
        previewImage: '',
        visibility: true,
        lastModified: new Date(),
    };
    const attribute = {
        attackValue: 4,
        defenseValue: 4,
        speedValue: 4,
        healthValue: 6,
        bonusAttack: DiceBonus.FourSideBonus,
        bonusDefense: DiceBonus.SixSideBonus,
    };
    const playerAlice: Player = { name: 'Alice', character: 'a', attributes: attribute, organizer: true, virtualPlayer: false };
    const playerBob: Player = { name: 'Bob', character: 'b', attributes: attribute, organizer: false, virtualPlayer: false };
    const mockCurrentGame: CurrentGame = { id: '1234', locked: false, players: [playerAlice, playerBob], boardGame };

    beforeEach(async () => {
        mockGameEventService = jasmine.createSpyObj('GameEventService', ['addLog', 'retrieveNumberOfPlayersInit', 'showFirstTurnNotification']);
        mockSocketClientService = jasmine.createSpyObj('SocketClientService', ['on', 'disconnect']);
        mockCurrentGameManager = jasmine.createSpyObj('CurrentGameManagerService', ['displayedCurrentGame']);
        mockGameSessionManager = jasmine.createSpyObj('GameSessionManagerService', [
            'chosenPlayer',
            'gameId',
            'updateListOfPlayers',
            'updateBoardGame',
            'updateActivePlayer',
            'updateChosenPlayer',
            'updateDisplayedList',
            'updateGameId',
        ]);
        mockPlayerSocketService = jasmine.createSpyObj('PlayerSocketService', [
            'emitGetGame',
            'emitLog',
            'onChangeLog',
            'onPlayerJoined',
            'onPlayerLeft',
            'onKicked',
            'onLockUpdated',
            'emitToggleLock',
            'emitStartGame',
            'emitLeaveGame',
            'emitUpdateGameStart',
            'emitAddVirtualPlayer',
            'disconnect',
        ]);

        await TestBed.configureTestingModule({
            declarations: [],
            imports: [CommonModule, WaitingPageComponent],
            providers: [
                { provide: SocketClientService, useValue: mockSocketClientService },
                { provide: CurrentGameManagerService, useValue: mockCurrentGameManager },
                { provide: GameSessionManagerService, useValue: mockGameSessionManager },
                { provide: PlayerSocketService, useValue: mockPlayerSocketService },
                { provide: GameEventService, useValue: mockGameEventService },
                provideRouter([]),
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(WaitingPageComponent);
        component = fixture.componentInstance;
        mockRouter = TestBed.inject(Router);
        spyOn(mockRouter, 'navigate');
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should fetch game data on init', () => {
        mockCurrentGameManager.displayedCurrentGame.and.returnValue(mockCurrentGame);
        mockPlayerSocketService.emitGetGame.and.callFake((id, callback) => callback(mockCurrentGame));

        component.ngOnInit();

        expect(mockCurrentGameManager.displayedCurrentGame).toHaveBeenCalled();
        expect(mockPlayerSocketService.emitGetGame).toHaveBeenCalledWith(mockCurrentGame.id, jasmine.any(Function));
        expect(component.currentGame).toEqual(mockCurrentGame);
    });

    it('should handle player joined event', () => {
        const playerAlices: Player = playerAlice;
        component.currentGame = { ...mockCurrentGame, players: [playerAlices] };
        const playerCharlie: Player = { name: 'Charlie', character: 'c', attributes: attribute, organizer: false, virtualPlayer: false };
        mockCurrentGameManager.displayedCurrentGame.and.returnValue(mockCurrentGame);
        mockPlayerSocketService.onPlayerJoined.and.callFake((callback) => callback(playerCharlie));

        component.ngOnInit();

        expect(component.currentGame.players).toContain(playerCharlie);
        expect(component.currentGame.players.length).toBe(2);
        expect(component.currentGame.players[1].name).toBe('Charlie');
    });

    it('should handle player left event', () => {
        component.currentGame = { ...mockCurrentGame, players: [...mockCurrentGame.players] };
        component.gameId = mockCurrentGame.id;
        component.currentGame.players = [playerAlice, playerBob];
        mockCurrentGameManager.displayedCurrentGame.and.returnValue(mockCurrentGame);
        mockPlayerSocketService.onPlayerLeft.and.callFake((callback) => callback(playerBob));
        component.ngOnInit();
        expect(component.currentGame.players).not.toContain(playerBob);
        expect(component.currentGame.players.length).toBe(1);
    });

    it('should handle player kicked event', () => {
        component.currentGame = { ...mockCurrentGame, players: [...mockCurrentGame.players] };
        component.gameId = mockCurrentGame.id;
        component.currentGame.players = [playerAlice, playerBob];
        mockCurrentGameManager.displayedCurrentGame.and.returnValue(mockCurrentGame);
        mockPlayerSocketService.onKicked.and.callFake((callback) => callback(playerBob));
        component.ngOnInit();
        expect(component.currentGame.players).not.toContain(playerBob);
        expect(component.currentGame.players.length).toBe(1);
    });

    it('should handle lock updated event', () => {
        const updatedGame: CurrentGame = { ...mockCurrentGame, locked: true };
        mockCurrentGameManager.displayedCurrentGame.and.returnValue(mockCurrentGame);
        mockPlayerSocketService.onLockUpdated.and.callFake((callback) => callback(updatedGame));
        component.gameId = updatedGame.id;
        component.ngOnInit();
        expect(mockPlayerSocketService.onLockUpdated).toHaveBeenCalled();
        expect(component.currentGame).toEqual(updatedGame);
    });

    it('should toggle room state', () => {
        component.gameId = mockCurrentGame.id;
        component.currentGame = mockCurrentGame;
        mockPlayerSocketService.emitToggleLock.and.callFake((id, callback) => callback(true));

        component.toggleRoomState();

        expect(mockPlayerSocketService.emitToggleLock).toHaveBeenCalledWith(mockCurrentGame.id, jasmine.any(Function));
        expect(component.currentGame.locked).toBeTrue();
    });

    it('should not toggle room state if room is full and locked', () => {
        const fullGame: CurrentGame = {
            ...mockCurrentGame,
            locked: true,
            players: Array(PlayerLimits[mockCurrentGame.boardGame.size].maxPlayers).fill({}),
        };
        component.gameId = fullGame.id;
        component.currentGame = fullGame;

        component.toggleRoomState();

        expect(mockPlayerSocketService.emitToggleLock).not.toHaveBeenCalled();
    });

    it('should automatically lock room if player limit is reached', () => {
        const fullGame: CurrentGame = {
            ...mockCurrentGame,
            players: Array(PlayerLimits[mockCurrentGame.boardGame.size].maxPlayers).fill({}),
            locked: false,
        };
        component.gameId = fullGame.id;
        component.currentGame = fullGame;
        component.automaticLock();
        expect(mockPlayerSocketService.emitToggleLock).toHaveBeenCalled();
    });

    it('should start game if organizer', () => {
        component.gameId = mockCurrentGame.id;
        mockGameSessionManager.chosenPlayer.and.returnValue(playerAlice);

        component.startGame();

        expect(mockPlayerSocketService.emitStartGame).toHaveBeenCalledWith(mockCurrentGame.id);
    });

    it('should not start game if not organizer', () => {
        component.gameId = mockCurrentGame.id;
        mockGameSessionManager.chosenPlayer.and.returnValue(playerBob);

        component.startGame();

        expect(mockPlayerSocketService.emitStartGame).not.toHaveBeenCalled();
    });

    it('should show warning when trying to start CTF game with odd number of players', () => {
        const ctfGame: CurrentGame = {
            ...mockCurrentGame,
            boardGame: { ...mockCurrentGame.boardGame, gameMode: GameMode.CTF },
            players: [playerAlice],
        };
        component.currentGame = ctfGame;
        component.gameId = ctfGame.id;
        mockGameSessionManager.chosenPlayer.and.returnValue(playerAlice);

        component.startGame();

        expect(component.showPlayerAmountWarning).toBeTrue();
        expect(mockPlayerSocketService.emitStartGame).not.toHaveBeenCalled();
    });

    it('should navigate to error page when StartGame event has invalid data', () => {
        const invalidStartGameData = {
            boardGame: undefined,
            listOfPlayers: undefined,
            activePlayer: undefined,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any as socketDataForm.StartGameData;

        mockGameSessionManager.chosenPlayer.and.returnValue(playerAlice);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockSocketClientService.on.and.callFake((event: string, callback: (data: any) => void) => {
            if (event === SocketClientEventNames.StartGame) {
                callback(invalidStartGameData);
            }
        });

        component.configureSocketBase();
        expect(mockSocketClientService.on).toHaveBeenCalledWith(SocketClientEventNames.StartGame, jasmine.any(Function));
    });

    it('should delete player', () => {
        const playerToDelete: Player = playerBob;
        component.gameId = mockCurrentGame.id;
        component.deletePlayer(playerToDelete);
        expect(mockPlayerSocketService.emitLeaveGame).toHaveBeenCalledWith(mockCurrentGame.id, playerToDelete);
    });

    it('should check player limit', () => {
        component.currentGame = mockCurrentGame;
        const minPlayers = PlayerLimits[mockCurrentGame.boardGame.size].minPlayers;

        const result = component.playerlimit();

        expect(result).toBe(mockCurrentGame.players.length < minPlayers);
    });

    it('should check if current player is organizer', () => {
        mockGameSessionManager.chosenPlayer.and.returnValue(playerAlice);

        const result = component.isOrganizer();

        expect(result).toBeTrue();
    });

    it('should configure socket base and handle start game event', () => {
        const startGameData: socketDataForm.StartGameData = {
            boardGame: mockCurrentGame.boardGame,
            listOfPlayers: mockCurrentGame.players,
            activePlayer: mockCurrentGame.players[0],
        };

        mockGameSessionManager.chosenPlayer.and.returnValue(playerAlice);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockSocketClientService.on.and.callFake((event: string, callback: (data: any) => void) => {
            if (event === SocketClientEventNames.StartGame) {
                callback(startGameData);
            }
        });
        component.configureSocketBase();
        expect(mockSocketClientService.on).toHaveBeenCalledWith(SocketClientEventNames.StartGame, jasmine.any(Function));
        expect(mockGameSessionManager.updateListOfPlayers).toHaveBeenCalledWith(startGameData.listOfPlayers);
        expect(mockGameSessionManager.updateBoardGame).toHaveBeenCalledWith(startGameData.boardGame);
        expect(mockGameSessionManager.updateActivePlayer).toHaveBeenCalledWith(startGameData.activePlayer);
    });

    it('should select virtual player profile', () => {
        const profile = VirtualPlayerProfile.Agressive;
        component.gameId = mockCurrentGame.id;
        component.selectProfile(profile);
        expect(mockPlayerSocketService.emitAddVirtualPlayer).toHaveBeenCalledWith(mockCurrentGame.id, profile);
    });

    it('should show virtual Player profile popup', () => {
        component.showVirtualPlayerProfilePopup();
        expect(component['showVirtualPlayerProfile']).toBeTrue();
    });

    it('should call the show virtual player popup', () => {
        const popupSpy = spyOn(component, 'showVirtualPlayerProfilePopup');
        component.onGenerateVirtualPlayerClick();
        expect(popupSpy).toHaveBeenCalled();
    });

    it('should handle server error event', () => {
        mockSocketClientService.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === SocketClientEventNames.ServerError) {
                callback(null as unknown as T);
            }
        });

        component.configureSocketBase();

        expect(mockSocketClientService.on).toHaveBeenCalledWith(SocketClientEventNames.ServerError, jasmine.any(Function));

        expect(mockSocketClientService.disconnect).toHaveBeenCalled();
    });

    it('should check if room is full', () => {
        component.currentGame = mockCurrentGame;
        const maxPlayers = PlayerLimits[mockCurrentGame.boardGame.size].maxPlayers;
        component.currentGame.players = Array(maxPlayers).fill({});
        expect(component.isRoomFull()).toBeTrue();
    });
    it('should call addLog on non-fight events from onChangeLog', () => {
        let startGameCallback: (data: socketDataForm.StartGameData) => void = () => fail('startGameCallback not set');
        let onChangeLogCallback: (gameEvent: GameEvent) => void = () => fail('onChangeLogCallback not set');

        mockGameSessionManager.chosenPlayer.and.returnValue({ name: 'Alice' } as Player);

        mockSocketClientService.on.and.callFake((eventName, callback) => {
            if (eventName === SocketClientEventNames.StartGame) {
                startGameCallback = callback as (data: socketDataForm.StartGameData) => void;
            }
        });

        mockPlayerSocketService.onChangeLog.and.callFake((callback) => {
            onChangeLogCallback = callback;
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            return { unsubscribe: () => {} };
        });

        component.configureSocketBase();

        startGameCallback({
            boardGame: {} as BoardGame,
            listOfPlayers: [{ name: 'Alice' }] as Player[],
            activePlayer: { name: 'Alice' } as Player,
        });

        const event: GameEvent = {
            message: 'Test log',
            type: GameEventType.StartTurn,
            timestamp: new Date(),
            player: ['Alice'] as string[],
        };

        onChangeLogCallback(event);

        expect(mockGameEventService.addLog).toHaveBeenCalledWith(event);
    });

    it('should update chosen player when matching player is found in list', () => {
        const mockChosenPlayer = { name: 'Alice' } as Player;
        const mockPlayers = [{ name: 'Alice' }, { name: 'Bob' }] as Player[];
        mockGameSessionManager.chosenPlayer.and.returnValue(mockChosenPlayer);
        const startGameCallback = mockSocketClientService.on.calls.argsFor(0)[1];
        startGameCallback({
            boardGame: {} as BoardGame,
            listOfPlayers: mockPlayers,
            activePlayer: {} as Player,
        });
        expect(component['gameSessionManager'].updateChosenPlayer).toHaveBeenCalledWith(mockPlayers[0]);
    });
});

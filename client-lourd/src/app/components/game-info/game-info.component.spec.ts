import { SimpleChange, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { STANDARD_GAME_NAME, STANDARD_PLAYER, STANDARD_PLAYERS, STANDARD_VIRTUAL_PLAYERS } from '@app/constants/development-constants';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { CurrentGame } from '@common/current-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { GameMode } from '@common/enums/game-mode';
import { ItemName } from '@common/enums/item-name';
import { ItemType } from '@common/enums/item-type';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import { Player } from '@common/player';
import { VirtualPlayer } from '@common/virtual-player';
import { GameInfoComponent } from './game-info.component';
import { GamePrivacy } from '@common/enums/game-visibility';

interface GameInfoComponentTestInterface {
    getGameData(): void;
    useMockPlayers(): void;
}

class TestGameInfoComponent extends GameInfoComponent {
    testIsAggressive(player: Player): boolean {
        return this.isAggressive(player);
    }
}

const MOCK_GAME_ID = '1234';
const MOCK_CURRENT_GAME: CurrentGame = {
    id: MOCK_GAME_ID,
    name: 'Partie Test',
    boardGame: {
        id: 'mockBoardGameId',
        name: '',
        description: 'Mock Board Game',
        size: BoardGameSize.Small,
        gameMode: GameMode.Normal,
        tiles: [],
        previewImage: '',
        lastModified: new Date(),
        privacy: GamePrivacy.Public,
        ownerId: ''
    },
    players: [...STANDARD_PLAYERS],
    locked: false,
    adminId: 'adminId',
};

describe('GameInfoComponent', () => {
    let component: TestGameInfoComponent;
    let fixture: ComponentFixture<TestGameInfoComponent>;

    let mockGameSessionManagerService: jasmine.SpyObj<GameSessionManagerService>;
    let mockPlayerSocketService: jasmine.SpyObj<PlayerSocketService>;

    let activePlayerSignal = signal<Player>({ ...STANDARD_PLAYER, name: '' });
    let displayedPlayerListSignal = signal<Player[]>([]);
    let listOfPlayersSignal = signal<Player[]>([]);
    let gameIdSignal = signal<string>('');

    beforeEach(async () => {
        activePlayerSignal = signal<Player>({ ...STANDARD_PLAYER, name: '' });
        displayedPlayerListSignal = signal<Player[]>([]);
        listOfPlayersSignal = signal<Player[]>([]);
        gameIdSignal = signal<string>('');

        mockGameSessionManagerService = jasmine.createSpyObj<GameSessionManagerService>('GameSessionManagerService', ['gameId'], {
            activePlayer: activePlayerSignal,
            displayedPlayerList: displayedPlayerListSignal,
            listOfPlayers: listOfPlayersSignal,
            gameId: gameIdSignal,
        });

        mockPlayerSocketService = jasmine.createSpyObj<PlayerSocketService>('PlayerSocketService', ['emitGetGame']);

        await TestBed.configureTestingModule({
            imports: [TestGameInfoComponent],
            providers: [
                { provide: GameSessionManagerService, useValue: mockGameSessionManagerService },
                { provide: PlayerSocketService, useValue: mockPlayerSocketService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(TestGameInfoComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with default values from the component logic', () => {
        expect(component.gameName).toBe(STANDARD_GAME_NAME);
        expect(component.activePlayerName).toBe('');
        expect(component.players).toEqual([]);
    });

    it('should update activePlayerName if activePlayer has a non-empty name', () => {
        activePlayerSignal.set({ ...STANDARD_PLAYER, name: 'Active P1' });
        fixture.detectChanges();
        expect(component.activePlayerName).toBe('Active P1');
    });

    it('should NOT update activePlayerName if new activePlayer has empty name', () => {
        expect(component.activePlayerName).toBe('');
        activePlayerSignal.set({ ...STANDARD_PLAYER, name: '' });
        fixture.detectChanges();
        expect(component.activePlayerName).toBe('');
        expect(component.activePlayerName).toBe('');
    });

    it('should update players when displayedPlayerList is non-empty', () => {
        displayedPlayerListSignal.set([
            { ...STANDARD_PLAYER, name: 'Displayed 1' },
            { ...STANDARD_PLAYER, name: 'Displayed 2' },
        ]);
        fixture.detectChanges();

        expect(component.players).toEqual([
            { ...STANDARD_PLAYER, name: 'Displayed 1' },
            { ...STANDARD_PLAYER, name: 'Displayed 2' },
        ]);
    });

    it('should not override players if displayedPlayerList is empty', () => {
        expect(component.players).toEqual([]);

        displayedPlayerListSignal.set([]);
        fixture.detectChanges();

        expect(component.players).toEqual([]);
    });

    it('should return true if the player has a flag in their inventory', () => {
        const playerWithFlag: Player = {
            ...STANDARD_PLAYER,
            inventory: [
                {
                    name: ItemName.Flag,
                    type: ItemType.ConditionBased,
                    description: '',
                },
            ],
        };
        expect(component.hasFlag(playerWithFlag)).toBeTrue();
    });

    describe('ngOnChanges / getGameData', () => {
        it('should call getGameData if gameId changes to a non-null value', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const getGameDataSpy = spyOn<any>(component, 'getGameData').and.callThrough();

            component.gameId = '1234';
            component.ngOnChanges({ gameId: new SimpleChange(null, '1234', true) });

            fixture.detectChanges();

            expect(getGameDataSpy).toHaveBeenCalled();
        });

        it('should NOT call getGameData if gameId is null or undefined', () => {
            const testComp = component as unknown as GameInfoComponentTestInterface;
            const getGameDataSpy = spyOn(testComp, 'getGameData').and.callThrough();

            component.ngOnChanges({
                gameId: new SimpleChange(undefined, null, true),
            });
            expect(getGameDataSpy).not.toHaveBeenCalled();
        });

        it('should call useMockPlayers if gameId is null', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const useMockPlayersSpy = spyOn<any>(component, 'useMockPlayers').and.callThrough();

            component.gameId = null;
            component.ngOnChanges({ gameId: new SimpleChange('1234', null, true) });

            fixture.detectChanges();

            expect(useMockPlayersSpy).toHaveBeenCalled();
        });

        it('should call useMockPlayers if gameId is "0000"', () => {
            const testComp = component as unknown as GameInfoComponentTestInterface;
            const useMockPlayersSpy = spyOn(testComp, 'useMockPlayers').and.callThrough();

            component.gameId = '0000';
            component.ngOnChanges({
                gameId: new SimpleChange(undefined, '0000', true),
            });

            expect(useMockPlayersSpy).toHaveBeenCalled();
        });

        it('should call emitGetGame with gameId on getGameData', () => {
            component.gameId = MOCK_GAME_ID;
            const testComp = component as unknown as GameInfoComponentTestInterface;
            testComp.getGameData();

            expect(mockPlayerSocketService.emitGetGame).toHaveBeenCalledWith(MOCK_GAME_ID, jasmine.any(Function));
        });

        it('should keep gameName and players if getGameData finds a valid game and sessionPlayers is non-empty', () => {
            displayedPlayerListSignal.set([{ ...STANDARD_PLAYER, name: 'Session A' }]);

            mockPlayerSocketService.emitGetGame.and.callFake((gameId, callback) => {
                callback(MOCK_CURRENT_GAME);
            });

            component.gameId = MOCK_GAME_ID;
            (component as unknown as GameInfoComponentTestInterface).getGameData();
            fixture.detectChanges();

            expect(component.players).toEqual([{ ...STANDARD_PLAYER, name: 'Session A' }]);
            expect(component.gameName).toBe('Partie Test');
        });

        it('should handle undefined game in getGameData', () => {
            mockPlayerSocketService.emitGetGame.and.callFake((gameId, callback) => {
                callback(undefined as unknown as CurrentGame);
            });

            component.gameId = '9999';
            (component as unknown as GameInfoComponentTestInterface).getGameData();

            expect(component.gameName).toBe(STANDARD_GAME_NAME);
        });

        it('should handle game with empty players list correctly', () => {
            mockPlayerSocketService.emitGetGame.and.callFake((gameId, callback) => {
                callback({ ...MOCK_CURRENT_GAME, players: [] });
            });

            const testComp = component as unknown as GameInfoComponentTestInterface;
            component.gameId = '9999';
            testComp.getGameData();

            expect(component.gameName).toBe('Partie Test');
        });

        it('should set gameName from game.name if available, else from game.boardGame.name, else keep standard', () => {
            const testComp = component as unknown as GameInfoComponentTestInterface;
            mockPlayerSocketService.emitGetGame.and.callFake((gameId, callback) => {
                callback({
                    ...MOCK_CURRENT_GAME,
                    name: 'NomDePartie',
                    boardGame: { ...MOCK_CURRENT_GAME.boardGame, name: 'Partie Test' },
                });
            });
            component.gameId = '2222';
            testComp.getGameData();
            fixture.detectChanges();
            expect(component.gameName).toBe('NomDePartie');

            mockPlayerSocketService.emitGetGame.and.callFake((gameId, callback) => {
                callback({
                    ...MOCK_CURRENT_GAME,
                    name: undefined,
                    boardGame: { ...MOCK_CURRENT_GAME.boardGame, name: 'Partie Test' },
                });
            });
            testComp.getGameData();
            fixture.detectChanges();
            expect(component.gameName).toBe('Partie Test');

            mockPlayerSocketService.emitGetGame.and.callFake((gameId, callback) => {
                callback({
                    ...MOCK_CURRENT_GAME,
                    name: undefined,
                    boardGame: { ...MOCK_CURRENT_GAME.boardGame, name: '' },
                });
            });
            testComp.getGameData();
            fixture.detectChanges();
            expect(component.gameName).toBe(STANDARD_GAME_NAME);
        });

        it('should define correctly boardSize and gameMode in getGameData', () => {
            mockPlayerSocketService.emitGetGame.and.callFake((gameId, callback) => {
                callback({
                    ...MOCK_CURRENT_GAME,
                    boardGame: {
                        ...MOCK_CURRENT_GAME.boardGame,
                        size: BoardGameSize.Medium,
                        gameMode: GameMode.CTF,
                    },
                });
            });

            component.gameId = '5555';
            (component as unknown as GameInfoComponentTestInterface).getGameData();
            fixture.detectChanges();

            expect(component.boardSize).toBe(BoardGameSize.Medium);
            expect(component.gameMode).toBe(GameMode.CTF);
        });

        it('should use mock players if getGameData receives undefined game', () => {
            const testComp = component as unknown as GameInfoComponentTestInterface;
            const useMockPlayersSpy = spyOn(testComp, 'useMockPlayers').and.callThrough();

            mockPlayerSocketService.emitGetGame.and.callFake((gameId, callback) => {
                callback(undefined as unknown as CurrentGame);
            });

            component.gameId = '9999';
            testComp.getGameData();

            expect(useMockPlayersSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('useMockPlayers()', () => {
        it('should use listOfPlayers if it is not empty', () => {
            const testComp = component as unknown as GameInfoComponentTestInterface;

            listOfPlayersSignal.set([{ ...STANDARD_PLAYER, name: 'Session X' }]);

            testComp.useMockPlayers();
            fixture.detectChanges();

            expect(component.players).toEqual([{ ...STANDARD_PLAYER, name: 'Session X' }]);
        });

        it('should use sorted STANDARD_PLAYERS if listOfPlayers is empty', () => {
            const testComp = component as unknown as GameInfoComponentTestInterface;

            const expectedSortedPlayers = [...STANDARD_PLAYERS].sort((a, b) => {
                const speedA = a.attributes?.speedValue ?? 0;
                const speedB = b.attributes?.speedValue ?? 0;

                if (speedB !== speedA) {
                    return speedB - speedA;
                }

                return (a.name || '').localeCompare(b.name || '');
            });

            testComp.useMockPlayers();
            fixture.detectChanges();

            expect(component.players).toEqual(expectedSortedPlayers);
        });

        it('should set activePlayerName from activePlayer if it has a name', () => {
            const testComp = component as unknown as GameInfoComponentTestInterface;
            activePlayerSignal.set({ ...STANDARD_PLAYER, name: 'ActiveFromSession' });

            testComp.useMockPlayers();
            fixture.detectChanges();

            expect(component.activePlayerName).toBe('ActiveFromSession');
        });
    });

    it('should sort players by descending speed, then by name if speeds are equal', () => {
        const testPlayers: Player[] = [
            {
                ...STANDARD_PLAYER,
                name: 'Bob',
                attributes: { ...STANDARD_PLAYER.attributes, speedValue: 5 },
            },
            {
                ...STANDARD_PLAYER,
                name: 'Alice',
                attributes: { ...STANDARD_PLAYER.attributes, speedValue: 10 },
            },
            {
                ...STANDARD_PLAYER,
                name: 'Charlie',
                attributes: { ...STANDARD_PLAYER.attributes, speedValue: 5 },
            },
        ];

        const sorted = component['sortPlayersByInitialSpeedAndName'](testPlayers);

        expect(sorted.map((player) => player.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    describe('isAggressive', () => {
        it('should return true for aggressive virtual player', () => {
            const aggressiveVirtualPlayer: Player = {
                ...STANDARD_VIRTUAL_PLAYERS[0],
                name: 'AggressiveBot',
                virtualPlayer: true,
                profile: VirtualPlayerProfile.Agressive,
            } as VirtualPlayer;
            expect(component.testIsAggressive(aggressiveVirtualPlayer)).toBeTrue();
        });

        it('should return false for defensive virtual player', () => {
            const defensiveVirtualPlayer: Player = {
                ...STANDARD_PLAYER,
                name: 'DefensiveBot',
                virtualPlayer: true,
                profile: VirtualPlayerProfile.Defensive,
            } as VirtualPlayer;
            expect(component.testIsAggressive(defensiveVirtualPlayer)).toBeFalse();
        });

        it('should return false for non-virtual player', () => {
            const regularPlayer: Player = {
                ...STANDARD_PLAYER,
                name: 'Human',
                virtualPlayer: false,
            };
            expect(component.testIsAggressive(regularPlayer)).toBeFalse();
        });
    });
});

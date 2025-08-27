import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { CurrentGameManagerService } from '@app/services/current-game-manager/current-game-manager.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { BoardGame } from '@common/board-game';
import { CurrentGame } from '@common/current-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { DiceBonus } from '@common/enums/dice-bonus';
import { GameMode } from '@common/enums/game-mode';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import { Player } from '@common/player';
import { PlayersListComponent } from './players-list';

describe('PlayersListComponent', () => {
    let component: PlayersListComponent;
    let fixture: ComponentFixture<PlayersListComponent>;
    let mockPlayerSocketService: jasmine.SpyObj<PlayerSocketService>;
    let mockCurrentGameManager: jasmine.SpyObj<CurrentGameManagerService>;
    let mockGameSessionManager: jasmine.SpyObj<GameSessionManagerService>;
    let router: Router;
    const attribute = {
        attackValue: 4,
        defenseValue: 4,
        speedValue: 4,
        healthValue: 6,
        bonusAttack: DiceBonus.FourSideBonus,
        bonusDefense: DiceBonus.SixSideBonus,
    };

    beforeEach(async () => {
        mockPlayerSocketService = jasmine.createSpyObj('PlayerSocketService', [
            'emitGetGame',
            'onPlayerJoined',
            'onPlayerLeft',
            'onKicked',
            'onAdminLeft',
            'disconnect',
            'emitLeaveGame',
            'emitKickPlayer',
        ]);
        mockCurrentGameManager = jasmine.createSpyObj('CurrentGameManagerService', ['addPlayer', 'removePlayer', 'reset']);
        mockGameSessionManager = jasmine.createSpyObj('GameSessionManagerService', ['isCurrentPlayer', 'chosenPlayer']);
        await TestBed.configureTestingModule({
            imports: [PlayersListComponent],
            providers: [
                { provide: PlayerSocketService, useValue: mockPlayerSocketService },
                { provide: CurrentGameManagerService, useValue: mockCurrentGameManager },
                { provide: GameSessionManagerService, useValue: mockGameSessionManager },
                provideRouter([]),
            ],
        }).compileComponents();
    });
    beforeEach(() => {
        fixture = TestBed.createComponent(PlayersListComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router);
        spyOn(router, 'navigate');
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load players list from game on init', () => {
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
        const playerAlice: Player = { name: 'Alice', character: 'a', attributes: attribute, organizer: true, virtualPlayer: false };
        const playerBob: Player = { name: 'Bob', character: 'b', attributes: attribute, organizer: false, virtualPlayer: false };
        const mockGame: CurrentGame = { id: '1234', locked: false, players: [playerAlice, playerBob], boardGame };
        mockPlayerSocketService.emitGetGame.and.callFake((gameId, callback) => callback(mockGame));

        component.gameId = '1234';
        component.ngOnInit();

        expect(mockPlayerSocketService.emitGetGame).toHaveBeenCalledWith('1234', jasmine.any(Function));
        expect(component.playersList.length).toBe(2);
        expect(component.playersList[0].name).toBe('Alice');
        expect(component.playersList[1].name).toBe('Bob');
    });

    it('should handle player joined event', () => {
        const playerAlice: Player = { name: 'Alice', character: 'a', attributes: attribute, organizer: true, virtualPlayer: false };
        component.playersList = [playerAlice];
        const playerCharlie: Player = { name: 'Charlie', character: 'c', attributes: attribute, organizer: false, virtualPlayer: false };

        mockPlayerSocketService.onPlayerJoined.and.callFake((callback: (player: Player) => void) => {
            callback(playerCharlie);
        });
        component.gameId = '1234';
        component.ngOnInit();
        expect(component.playersList.length).toBe(2);
        expect(component.playersList[1].name).toBe('Charlie');
        expect(mockCurrentGameManager.addPlayer).toHaveBeenCalledWith(playerCharlie);
    });

    it('should handle player left event when not current player', () => {
        const playerAlice: Player = { name: 'Alice', character: 'a', attributes: attribute, organizer: true, virtualPlayer: false };
        const leavingPlayer: Player = { name: 'Bob', character: 'b', attributes: attribute, organizer: false, virtualPlayer: false };
        component.playersList = [playerAlice, leavingPlayer];

        mockGameSessionManager.isCurrentPlayer.and.returnValue(false);
        mockPlayerSocketService.onPlayerLeft.and.callFake((callback) => callback(leavingPlayer));
        component.gameId = '1234';
        component.ngOnInit();
        expect(component.playersList.length).toBe(1);
        expect(component.playersList[0].name).toBe('Alice');
        expect(mockCurrentGameManager.removePlayer).toHaveBeenCalledWith(leavingPlayer);
    });

    it('should handle player left event when current player', () => {
        const leavingPlayer: Player = { name: 'Charlie', character: 'c', attributes: attribute, organizer: false, virtualPlayer: false };
        const playerAlice: Player = { name: 'Alice', character: 'a', attributes: attribute, organizer: true, virtualPlayer: false };
        component.playersList = [playerAlice, leavingPlayer];

        mockGameSessionManager.isCurrentPlayer.and.returnValue(true);
        mockPlayerSocketService.onPlayerLeft.and.callFake((callback: (player: Player) => void) => {
            callback(leavingPlayer);
        });
        component.gameId = '1234';
        component.ngOnInit();

        expect(component.playersList.length).toBe(0);
        expect(mockCurrentGameManager.removePlayer).toHaveBeenCalledWith(leavingPlayer);
        expect(mockPlayerSocketService.disconnect).toHaveBeenCalled();
    });

    it('should handle player kicked event when not current player', () => {
        const kickedPlayer: Player = { name: 'Charlie', character: 'c', attributes: attribute, organizer: false, virtualPlayer: false };
        const playerAlice: Player = { name: 'Alice', character: 'a', attributes: attribute, organizer: true, virtualPlayer: false };
        const playerBob: Player = { name: 'Bob', character: 'b', attributes: attribute, organizer: false, virtualPlayer: false };
        component.playersList = [playerAlice, kickedPlayer, playerBob];

        mockGameSessionManager.isCurrentPlayer.and.returnValue(false);
        mockPlayerSocketService.onKicked.and.callFake((callback: (player: Player) => void) => {
            callback(kickedPlayer);
        });
        component.gameId = '1234';
        component.ngOnInit();

        expect(component.playersList.length).toBe(2);
        expect(component.playersList[1].name).toBe('Bob');
        expect(mockCurrentGameManager.removePlayer).toHaveBeenCalledWith(kickedPlayer);
    });

    it('should handle player kicked event when current player', () => {
        const kickedPlayer: Player = { name: 'Charlie', character: 'c', attributes: attribute, organizer: false, virtualPlayer: false };
        const playerAlice: Player = { name: 'Alice', character: 'a', attributes: attribute, organizer: true, virtualPlayer: false };
        component.playersList = [playerAlice, kickedPlayer];

        mockGameSessionManager.isCurrentPlayer.and.returnValue(true);
        mockPlayerSocketService.onKicked.and.callFake((callback: (player: Player) => void) => {
            callback(kickedPlayer);
        });
        component.gameId = '1234';
        component.ngOnInit();

        expect(component.playersList.length).toBe(0);
        expect(mockCurrentGameManager.removePlayer).toHaveBeenCalledWith(kickedPlayer);
        expect(mockPlayerSocketService.disconnect).toHaveBeenCalled();
        expect(component.showAlertConfirmation).toBeTrue();
    });

    it('should handle admin leaving the game', () => {
        const playerAlice: Player = { name: 'Alice', character: 'a', attributes: attribute, organizer: true, virtualPlayer: false };
        const playerBob: Player = { name: 'Bob', character: 'b', attributes: attribute, organizer: false, virtualPlayer: false };
        component.playersList = [playerAlice, playerBob];
        component.gameId = '1234';
        mockPlayerSocketService.onAdminLeft.and.callFake((callback: (gameId: string) => void) => {
            callback('1234');
        });

        component.ngOnInit();

        expect(component.playersList.length).toBe(0);
        expect(component.showAlertOfAdminLeft).toBeTrue();
        expect(mockCurrentGameManager.reset).toHaveBeenCalled();
    });

    it('should delete player when deletePlayer is called', () => {
        const playerToDelete: Player = { name: 'David', character: 'd', attributes: attribute, organizer: false, virtualPlayer: false };
        component.gameId = '1234';
        spyOn(component, 'closePlayerModal');

        component.deletePlayer(playerToDelete);

        expect(mockPlayerSocketService.emitLeaveGame).toHaveBeenCalledWith('1234', playerToDelete);
        expect(component.closePlayerModal).toHaveBeenCalled();
    });

    it('should kick player when kickPlayer is called', () => {
        const playerToKick: Player = { name: 'Eve', character: 'e', attributes: attribute, organizer: false, virtualPlayer: false };
        component.gameId = '1234';
        spyOn(component, 'closePlayerModal');

        component.kickPlayer(playerToKick);

        expect(mockPlayerSocketService.emitKickPlayer).toHaveBeenCalledWith('1234', playerToKick);
        expect(component.closePlayerModal).toHaveBeenCalled();
    });

    it('should return true if the current player is an organizer', () => {
        mockGameSessionManager.chosenPlayer.and.returnValue({ organizer: true } as Player);
        expect(component.isOrganizer()).toBeTrue();
    });

    it('should return false if the current player is not an organizer', () => {
        mockGameSessionManager.chosenPlayer.and.returnValue({ organizer: false } as Player);
        expect(component.isOrganizer()).toBeFalse();
    });

    it('should return true if an alert should be shown', () => {
        component.showAlertConfirmation = true;
        expect(component.showAlert()).toBeTrue();

        component.showAlertConfirmation = false;
        component.showAlertOfAdminLeft = true;
        expect(component.showAlert()).toBeTrue();
    });

    it('should return false if no alert is active', () => {
        component.showAlertConfirmation = false;
        component.showAlertOfAdminLeft = false;
        expect(component.showAlert()).toBeFalse();
    });

    it('should set selectedPlayer when openPlayerModal is called', () => {
        const player: Player = { name: 'Alice', character: 'a', attributes: attribute, organizer: false, virtualPlayer: false };
        component.openPlayerModal(player);
        expect(component.selectedPlayer).toBe(player);
    });

    it('should reset selectedPlayer when closePlayerModal is called', () => {
        component.selectedPlayer = { name: 'Alice', character: 'a', attributes: attribute, organizer: false, virtualPlayer: false };
        component.closePlayerModal();
        expect(component.selectedPlayer).toBeNull();
    });

    it('should navigate to "/" and hide alerts when hideAlert is called', () => {
        component.showAlertConfirmation = true;
        component.showAlertOfAdminLeft = true;
        component.hideAlert();
        expect(router.navigate).toHaveBeenCalledWith(['/']);
        expect(component.showAlertConfirmation).toBeFalse();
        expect(component.showAlertOfAdminLeft).toBeFalse();
    });

    it('should identify aggressive virtual players correctly', () => {
        const aggressiveVirtualPlayer = {
            name: 'AggressiveBot',
            character: 'bot',
            attributes: attribute,
            organizer: false,
            virtualPlayer: true,
            profile: VirtualPlayerProfile.Agressive,
        };
        expect(component.isAggressive(aggressiveVirtualPlayer)).toBeTrue();
    });

    it('should identify non-aggressive virtual players correctly', () => {
        const defensiveVirtualPlayer = {
            name: 'DefensiveBot',
            character: 'bot',
            attributes: attribute,
            organizer: false,
            virtualPlayer: true,
            profile: VirtualPlayerProfile.Defensive,
        };
        expect(component.isAggressive(defensiveVirtualPlayer)).toBeFalse();
    });

    it('should return false for non-virtual players', () => {
        const regularPlayer = {
            name: 'Human',
            character: 'human',
            attributes: attribute,
            organizer: false,
            virtualPlayer: false,
        };
        expect(component.isAggressive(regularPlayer)).toBeFalse();
    });
});

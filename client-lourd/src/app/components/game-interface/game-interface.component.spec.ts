import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerState } from '@common/enums/player-state';
import { Player } from '@common/player';
import { GameInterfaceComponent } from './game-interface.component';

import { CombatNotificationService } from '@app/services/combat-notification/combat-notification.service';
import { DiceService } from '@app/services/dice/dice.service';
import { GameInterfaceService } from '@app/services/game-interface/game-interface.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { GameSocketEventService } from '@app/services/game-socket-event/game-socket-event.service';

import { signal, WritableSignal } from '@angular/core';
import { STANDARD_PLAYERS } from '@app/constants/development-constants';
import { BehaviorSubject, Subject } from 'rxjs';

interface CombatEvent {
    type: string;
    payload?: unknown;
}

interface GameSocketEvent {
    eventType: string;
    data?: unknown;
}

const MOCK_PLAYER: Player = STANDARD_PLAYERS[0];
const MOCK_OPPONENT: Player = STANDARD_PLAYERS[1];

const DICE_VALUES_1 = 4;
const DICE_VALUES_2 = 6;

describe('GameInterfaceComponent', () => {
    let component: GameInterfaceComponent;
    let fixture: ComponentFixture<GameInterfaceComponent>;

    let mockGameSessionManagerService: jasmine.SpyObj<GameSessionManagerService>;
    let mockDiceService: Partial<DiceService>;
    let mockGameInterfaceService: jasmine.SpyObj<GameInterfaceService>;
    let mockCombatNotificationService: jasmine.SpyObj<CombatNotificationService>;
    let mockGameSocketEventService: jasmine.SpyObj<GameSocketEventService>;

    let diceValueSubject: Subject<number>;
    let escapeConfirmationSubject: Subject<boolean>;
    let combatEventsSubject: BehaviorSubject<CombatEvent | null>;
    let socketEventsSubject: BehaviorSubject<GameSocketEvent | null>;
    let mockFightClockValue: WritableSignal<number>;
    let mockPlayerState: WritableSignal<PlayerState>;
    let rollSubject: Subject<void>;

    beforeEach(async () => {
        mockFightClockValue = signal(0);
        mockPlayerState = signal(PlayerState.Defending);
        diceValueSubject = new Subject<number>();
        escapeConfirmationSubject = new Subject<boolean>();
        combatEventsSubject = new BehaviorSubject<CombatEvent | null>(null);
        socketEventsSubject = new BehaviorSubject<GameSocketEvent | null>(null);
        rollSubject = new Subject<void>();

        mockGameSessionManagerService = jasmine.createSpyObj(
            'GameSessionManagerService',
            ['attackPlayer', 'attemptEscape', 'decrementAmountOfEvasion', 'changeDisplayAttackClock'],
            {
                playerState: mockPlayerState,
                nbOfEvasions: signal(2),
                attackingPlayer: signal(MOCK_PLAYER),
                chosenPlayer: signal(MOCK_PLAYER),
                defendingPlayer: signal(MOCK_OPPONENT),
                turnClockValue: signal(0),
                fightClockValue: signal(0),
            },
        );

        mockPlayerState.set(PlayerState.Defending);
        mockGameSessionManagerService.nbOfEvasions.set(2);
        mockGameSessionManagerService.attackingPlayer.set(MOCK_PLAYER);
        mockGameSessionManagerService.chosenPlayer.set(MOCK_PLAYER);
        mockGameSessionManagerService.defendingPlayer.set(MOCK_OPPONENT);

        mockDiceService = {
            diceValue$: diceValueSubject.asObservable(),
            roll$: rollSubject.asObservable(),
            attackDiceValue$: diceValueSubject.asObservable(),
            defenseDiceValue$: diceValueSubject.asObservable(),
        };

        mockGameInterfaceService = jasmine.createSpyObj('GameInterfaceService', ['showEscapeConfirmation', 'hideEscapeConfirmation'], {
            isEscapeConfirmationVisible$: escapeConfirmationSubject.asObservable(),
        });

        mockCombatNotificationService = jasmine.createSpyObj('CombatNotificationService', [], {
            combatEvents$: combatEventsSubject.asObservable(),
        });

        mockGameSocketEventService = jasmine.createSpyObj('GameSocketEventService', [], {
            socketEvents$: socketEventsSubject.asObservable(),
            fightClockValue: mockFightClockValue,
        });

        await TestBed.configureTestingModule({
            imports: [GameInterfaceComponent],
            providers: [
                { provide: GameSessionManagerService, useValue: mockGameSessionManagerService },
                { provide: DiceService, useValue: mockDiceService },
                { provide: GameInterfaceService, useValue: mockGameInterfaceService },
                { provide: CombatNotificationService, useValue: mockCombatNotificationService },
                { provide: GameSocketEventService, useValue: mockGameSocketEventService },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(GameInterfaceComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should subscribe to diceValue$ and update currentDiceValue', () => {
        diceValueSubject.next(DICE_VALUES_1);
        expect(component.currentDiceValue).toBe(DICE_VALUES_1);

        diceValueSubject.next(DICE_VALUES_2);
        expect(component.currentDiceValue).toBe(DICE_VALUES_2);
    });

    it('should subscribe to isEscapeConfirmationVisible$ and update showEscapeConfirmation', () => {
        expect(component.showEscapeConfirmation).toBeFalse();

        escapeConfirmationSubject.next(true);
        expect(component.showEscapeConfirmation).toBeTrue();

        escapeConfirmationSubject.next(false);
        expect(component.showEscapeConfirmation).toBeFalse();
    });

    it('should call hideEscapeConfirmation from gameInterfaceService', () => {
        component.cancelEscape();
        expect(mockGameInterfaceService.hideEscapeConfirmation).toHaveBeenCalled();
    });

    it('should return "Attaquer" when player is attacking', () => {
        mockPlayerState.set(PlayerState.Attacking);
        expect(component.getAttackButtonText()).toBe('Attaquer');
    });

    it('should return "Adversaire attaque" when player is not attacking', () => {
        spyOn(mockGameSessionManagerService, 'playerState').and.returnValue(PlayerState.Defending);
        expect(component.getAttackButtonText()).toBe('Adversaire attaque');
    });

    it('should initialize currentPlayer, opponent, and attackingPlayer in ngOnInit', () => {
        component.ngOnInit();
        expect(component.currentPlayer.name).toBe('player-test1');
        expect(component.opponent.name).toBe('player-test2');
        expect(component.attackingPlayer.name).toBe('player-test1');
    });

    it('should call gameSessionManager.attackPlayer() when onAttack() is invoked', () => {
        mockPlayerState.set(PlayerState.Attacking);

        component.onAttack();
        expect(mockGameSessionManagerService.attackPlayer).toHaveBeenCalled();
    });

    it('should not call attackPlayer() if playerState is not Attacking', () => {
        mockPlayerState.set(PlayerState.Defending);
        fixture.detectChanges();

        component.onAttack();
        expect(mockGameSessionManagerService.attackPlayer).not.toHaveBeenCalled();
    });

    it('should call showEscapeConfirmation when escape is possible', () => {
        mockPlayerState.set(PlayerState.Attacking);
        mockGameSessionManagerService.nbOfEvasions.set(2);
        component.currentPlayerEscapeAttempts = 2;
        component.onEscape();
        expect(mockGameInterfaceService.showEscapeConfirmation).toHaveBeenCalled();
    });

    it('should decrement currentPlayerEscapeAttempts and call attemptEscape() after confirmEscape()', () => {
        mockPlayerState.set(PlayerState.Attacking);
        component.currentPlayerEscapeAttempts = 2;
        component.confirmEscape();
        expect(mockGameInterfaceService.hideEscapeConfirmation).toHaveBeenCalled();
        expect(mockGameSessionManagerService.decrementAmountOfEvasion).toHaveBeenCalled();
        expect(mockGameSessionManagerService.attemptEscape).toHaveBeenCalled();
        expect(component.currentPlayerEscapeAttempts).toBe(1);
    });

    it('should call hideEscapeConfirmation when canceling escape', () => {
        component.cancelEscape();
        expect(mockGameInterfaceService.hideEscapeConfirmation).toHaveBeenCalled();
    });

    it('getAttackButtonText() returns "Attaquer" if playerState == Attacking', () => {
        mockPlayerState.set(PlayerState.Attacking);
        expect(component.getAttackButtonText()).toBe('Attaquer');
    });

    it('getAttackButtonText() returns "Adversaire attaque" if playerState != Attacking', () => {
        mockPlayerState.set(PlayerState.Defending);
        expect(component.getAttackButtonText()).toBe('Adversaire attaque');
    });

    it('isEscapeButtonDisabled() returns true if playerState != Attacking or currentPlayerEscapeAttempts <= 0', () => {
        mockPlayerState.set(PlayerState.Defending);
        expect(component.isEscapeButtonDisabled()).toBeTrue();

        mockPlayerState.set(PlayerState.Attacking);
        component.currentPlayerEscapeAttempts = 0;
        expect(component.isEscapeButtonDisabled()).toBeTrue();
    });

    it('should set opponent correctly when local player is not the attacking player', () => {
        mockGameSessionManagerService.chosenPlayer.set(MOCK_OPPONENT);
        mockGameSessionManagerService.attackingPlayer.set(MOCK_PLAYER);
        mockGameSessionManagerService.defendingPlayer.set(MOCK_OPPONENT);

        component.ngOnInit();

        expect(component.opponent.name).toBe(MOCK_PLAYER.name);
    });

    it('should not call showEscapeConfirmation if playerState is not Attacking', () => {
        mockPlayerState.set(PlayerState.Defending);
        component.currentPlayerEscapeAttempts = 2;
        component.onEscape();
        expect(mockGameInterfaceService.showEscapeConfirmation).not.toHaveBeenCalled();
    });

    it('should not call showEscapeConfirmation if currentPlayerEscapeAttempts is 0', () => {
        mockPlayerState.set(PlayerState.Attacking);
        component.currentPlayerEscapeAttempts = 0;
        component.onEscape();
        expect(mockGameInterfaceService.showEscapeConfirmation).not.toHaveBeenCalled();
    });
});

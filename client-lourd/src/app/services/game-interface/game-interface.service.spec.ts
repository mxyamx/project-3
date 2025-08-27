import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { STANDARD_PLAYER } from '@app/constants/development-constants';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { GameInterfaceService } from './game-interface.service';

const DELAY_FOR_EFFECT_TO_BE_ACTIVATED = 100;

describe('GameInterfaceService', () => {
    let service: GameInterfaceService;
    let gameSessionManagerMock: jasmine.SpyObj<GameSessionManagerService>;
    let leavingGameSignal: WritableSignal<boolean>;
    beforeEach(() => {
        leavingGameSignal = signal(false);

        gameSessionManagerMock = jasmine.createSpyObj<GameSessionManagerService>('GameSessionManagerService', [], {
            leavingGame$: leavingGameSignal.asReadonly(),
        });

        TestBed.configureTestingModule({
            providers: [GameInterfaceService, { provide: GameSessionManagerService, useValue: gameSessionManagerMock }],
        });

        service = TestBed.inject(GameInterfaceService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should set isInterfaceVisible$ to true after showInterface() is called', () => {
        service.showInterface();

        let latestValue: boolean | undefined;
        service.isInterfaceVisible$
            .subscribe((value) => {
                latestValue = value;
            })
            .unsubscribe();

        expect(latestValue).toBe(true);
    });

    it('should set isInterfaceVisible$ to false after hideInterface() is called', () => {
        service.showInterface();
        service.hideInterface();

        let latestValue: boolean | undefined;
        service.isInterfaceVisible$
            .subscribe((value) => {
                latestValue = value;
            })
            .unsubscribe();

        expect(latestValue).toBe(false);
    });

    it('should set isEscapeConfirmationVisible$ to true after showEscapeConfirmation() is called', () => {
        service.showEscapeConfirmation();

        let latestValue: boolean | undefined;
        service.isEscapeConfirmationVisible$
            .subscribe((value) => {
                latestValue = value;
            })
            .unsubscribe();

        expect(latestValue).toBe(true);
    });

    it('should set isEscapeConfirmationVisible$ to false after hideEscapeConfirmation() is called', () => {
        service.showEscapeConfirmation();
        service.hideEscapeConfirmation();

        let latestValue: boolean | undefined;
        service.isEscapeConfirmationVisible$
            .subscribe((value) => {
                latestValue = value;
            })
            .unsubscribe();

        expect(latestValue).toBe(false);
    });

    it('should call hideInterface() when leavingGame$ is set to true', (done) => {
        const hideInterfaceSpy = spyOn(service, 'hideInterface').and.callThrough();

        leavingGameSignal.set(true);

        setTimeout(() => {
            expect(hideInterfaceSpy).toHaveBeenCalled();
            done();
        }, DELAY_FOR_EFFECT_TO_BE_ACTIVATED);
    });

    it('should set playerId and opponentId when setPlayerIds() is called', () => {
        service.setPlayerIds('player1', 'player2');

        expect(service.getPlayerId()).toBe('player1');
        expect(service.getOpponentId()).toBe('player2');
    });

    it('should return true for isPlayerInCombat() if the player is in combat', () => {
        service.setPlayerIds('player1', 'player2');

        expect(service.isPlayerInCombat('player1')).toBeTrue();
        expect(service.isPlayerInCombat('player2')).toBeTrue();
        expect(service.isPlayerInCombat('someoneElse')).toBeFalse();
    });

    it('should correctly handle initiatorTurn', () => {
        expect(service.isInitiatorTurn()).toBeTrue();

        service.setInitiatorTurn(false);
        expect(service.isInitiatorTurn()).toBeFalse();

        service.setInitiatorTurn(true);
        expect(service.isInitiatorTurn()).toBeTrue();
    });

    it('should reset initiatorTurn to true when hideInterface() is called', () => {
        service.setInitiatorTurn(false);
        expect(service.isInitiatorTurn()).toBeFalse();

        service.hideInterface();
        expect(service.isInitiatorTurn()).toBeTrue();
    });

    it('should return undefined when no current player is set', () => {
        expect(service.getCurrentPlayer()).toBeUndefined();
    });

    it('should return the current player when set', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).currentPlayer = STANDARD_PLAYER;
        expect(service.getCurrentPlayer()).toEqual(STANDARD_PLAYER);
    });

    it('should return undefined when no opponent is set', () => {
        expect(service.getOpponent()).toBeUndefined();
    });

    it('should return the opponent player when set', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).opponent = STANDARD_PLAYER;
        expect(service.getOpponent()).toEqual(STANDARD_PLAYER);
    });
});

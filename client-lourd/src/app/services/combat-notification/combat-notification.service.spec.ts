import { signal, WritableSignal } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { STANDARD_PLAYERS } from '@app/constants/development-constants';
import { GameEventService } from '@app/services/game-event/game-event.service';
import { GameInterfaceService } from '@app/services/game-interface/game-interface.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { PlayerState } from '@common/enums/player-state';
import { CombatNotification, CombatNotificationService } from './combat-notification.service';

const NOTIFICATION_DISPLAY_TIME = 3000;
const INTERFACE_CLOSE_DELAY = 5000;
const NOTIFICATION_ANIMATION_DURATION = 500;
const DELAY_FOR_EFFECT_TO_BE_ACTIVATED = 100;
const TICK_MARGIN = 10;

describe('CombatNotificationService', () => {
    let service: CombatNotificationService;

    let mockGameSessionManagerService: Partial<GameSessionManagerService>;
    let mockGameInterfaceService: Partial<GameInterfaceService>;
    let mockGameEvent: jasmine.SpyObj<GameEventService>;

    let leavingGameSignal: WritableSignal<boolean>;
    let playerStateSignal: WritableSignal<PlayerState>;

    beforeEach(() => {
        leavingGameSignal = signal(false);
        playerStateSignal = signal(PlayerState.WaitingForAction);

        mockGameSessionManagerService = {
            leavingGame$: leavingGameSignal.asReadonly(),
            activePlayer: signal(STANDARD_PLAYERS[0]),
            playerState: playerStateSignal.asReadonly(),
            gameId: signal('mockedGameId'),
        };

        mockGameEvent = jasmine.createSpyObj('GameEventService', ['showLogTurnNotification']);

        mockGameInterfaceService = {
            hideInterface: jasmine.createSpy('hideInterface'),
        };

        TestBed.configureTestingModule({
            providers: [
                { provide: GameSessionManagerService, useValue: mockGameSessionManagerService },
                { provide: GameInterfaceService, useValue: mockGameInterfaceService },
                { provide: GameEventService, useValue: mockGameEvent },
                CombatNotificationService,
            ],
        });

        service = TestBed.inject(CombatNotificationService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should add a victory notification and hide it after a delay', fakeAsync(() => {
        let notifications: CombatNotification[] = [];
        const sub = service.notifications$.subscribe((values) => (notifications = values));

        service.showVictoryNotification();

        expect(notifications.length).toBe(1);
        expect(notifications[0].type).toBe('victory');
        expect(notifications[0].isVisible).toBeTrue();

        tick(NOTIFICATION_DISPLAY_TIME + TICK_MARGIN);
        expect(notifications.length).toBe(1);
        expect(notifications[0].isVisible).toBeFalse();

        tick(NOTIFICATION_ANIMATION_DURATION + TICK_MARGIN);
        expect(notifications.length).toBe(0);

        tick(INTERFACE_CLOSE_DELAY);
        expect(mockGameInterfaceService.hideInterface).toHaveBeenCalled();

        sub.unsubscribe();
    }));

    it('should add a defeat notification and hide it', fakeAsync(() => {
        let notifications: CombatNotification[] = [];
        const sub = service.notifications$.subscribe((values) => (notifications = values));

        service.showDefeatNotification();
        expect(notifications.length).toBe(1);
        expect(notifications[0].type).toBe('defeat');
        expect(notifications[0].isVisible).toBeTrue();

        tick(NOTIFICATION_DISPLAY_TIME + TICK_MARGIN);
        expect(notifications[0].isVisible).toBeFalse();

        tick(NOTIFICATION_ANIMATION_DURATION + TICK_MARGIN);
        expect(notifications.length).toBe(0);

        tick(INTERFACE_CLOSE_DELAY);
        expect(mockGameInterfaceService.hideInterface).toHaveBeenCalled();

        sub.unsubscribe();
    }));

    it('should display turn transition without triggering automatic interface closing', () => {
        let notifications: CombatNotification[] = [];
        const sub = service.notifications$.subscribe((values) => (notifications = values));

        service.showTurnTransition();
        expect(notifications.length).toBe(1);
        expect(notifications[0].type).toBe('turnTransition');
        expect(notifications[0].isVisible).toBeTrue();
        expect(notifications[0].position).toBe('bottom');

        sub.unsubscribe();
    });

    it('should hide turn transition when hideTurnTransition is called', fakeAsync(() => {
        let notifications: CombatNotification[] = [];
        const sub = service.notifications$.subscribe((values) => (notifications = values));

        service.showTurnTransition();
        expect(notifications.length).toBe(1);

        service.hideTurnTransition();
        expect(notifications[0].isVisible).toBeFalse();

        tick(NOTIFICATION_ANIMATION_DURATION + TICK_MARGIN);
        expect(notifications.length).toBe(0);

        sub.unsubscribe();
    }));

    it('should handle game over notification', fakeAsync(() => {
        let notifications: CombatNotification[] = [];
        const sub = service.notifications$.subscribe((values) => (notifications = values));

        service.showGameOverNotification('John le Magnifique');
        expect(notifications.length).toBe(1);
        expect(notifications[0].type).toBe('gameOver');
        expect(notifications[0].message).toContain('John le Magnifique');

        tick(NOTIFICATION_DISPLAY_TIME + TICK_MARGIN);
        expect(notifications[0].isVisible).toBeFalse();

        tick(NOTIFICATION_ANIMATION_DURATION + TICK_MARGIN);
        expect(notifications.length).toBe(0);

        tick(INTERFACE_CLOSE_DELAY);
        expect(mockGameInterfaceService.hideInterface).toHaveBeenCalled();

        sub.unsubscribe();
    }));

    it('should clear all notifications when leavingGame$ is set to true', (done) => {
        let notifications: CombatNotification[] = [];
        const sub = service.notifications$.subscribe((values) => (notifications = values));

        service.showVictoryNotification();
        service.showTurnTransition();
        expect(notifications.length).toBe(2);

        leavingGameSignal.set(true);

        setTimeout(() => {
            expect(notifications.length).toBe(0);
            sub.unsubscribe();
            done();
        }, DELAY_FOR_EFFECT_TO_BE_ACTIVATED);
    });

    it('should cancel the previous timeout if showVictoryNotification is called multiple times quickly', fakeAsync(() => {
        spyOn(window, 'clearTimeout');

        service.showVictoryNotification();
        service.showVictoryNotification();

        expect(window.clearTimeout).toHaveBeenCalled();
        tick(INTERFACE_CLOSE_DELAY);
    }));

    it('should hide defeat notification', fakeAsync(() => {
        let notifications: CombatNotification[] = [];
        const sub = service.notifications$.subscribe((values) => (notifications = values));

        service.showDefeatNotification();
        expect(notifications.length).toBe(1);
        expect(notifications[0].isVisible).toBeTrue();

        service.hideDefeatNotification();
        expect(notifications[0].isVisible).toBeFalse();

        tick(NOTIFICATION_ANIMATION_DURATION + TICK_MARGIN);
        expect(notifications.length).toBe(0);

        sub.unsubscribe();
    }));

    it('should hide victory notification', fakeAsync(() => {
        let notifications: CombatNotification[] = [];
        const sub = service.notifications$.subscribe((values) => (notifications = values));

        service.showVictoryNotification();
        expect(notifications.length).toBe(1);
        expect(notifications[0].isVisible).toBeTrue();

        service.hideVictoryNotification();
        expect(notifications[0].isVisible).toBeFalse();

        tick(NOTIFICATION_ANIMATION_DURATION + TICK_MARGIN);
        expect(notifications.length).toBe(0);

        sub.unsubscribe();
    }));

    it('should hide game over notification', fakeAsync(() => {
        let notifications: CombatNotification[] = [];
        const sub = service.notifications$.subscribe((values) => (notifications = values));

        service.showGameOverNotification('Test Winner');
        expect(notifications.length).toBe(1);
        expect(notifications[0].isVisible).toBeTrue();

        service.hideGameOverNotification();
        expect(notifications[0].isVisible).toBeFalse();

        tick(NOTIFICATION_ANIMATION_DURATION + TICK_MARGIN);
        expect(notifications.length).toBe(0);

        sub.unsubscribe();
    }));

    it('should cancel the previous timeout if a new combat notification is displayed before the delay ends', fakeAsync(() => {
        spyOn(window, 'clearTimeout');

        service.showVictoryNotification();
        expect(service['interfaceCloseTimeout']).not.toBeNull();

        service.showDefeatNotification();
        expect(window.clearTimeout).toHaveBeenCalled();

        tick(INTERFACE_CLOSE_DELAY);
    }));

    it('should handle trying to hide a non-existent notification', fakeAsync(() => {
        let notifications: CombatNotification[] = [];
        const sub = service.notifications$.subscribe((values) => (notifications = values));

        service.showVictoryNotification();
        expect(notifications.length).toBe(1);

        const nonExistentId = 'non-existent-id';
        service['hideNotification'](nonExistentId);

        expect(notifications.length).toBe(1);
        expect(notifications[0].isVisible).toBeTrue();

        sub.unsubscribe();
    }));

    it('should not show turn transition when in EndGame state', () => {
        playerStateSignal.set(PlayerState.EndGame);

        let notifications: CombatNotification[] = [];
        const sub = service.notifications$.subscribe((values) => (notifications = values));

        service.showTurnTransition();
        expect(notifications.length).toBe(0);

        sub.unsubscribe();
    });

    it('should handle game over notification with winner', fakeAsync(() => {
        let notifications: CombatNotification[] = [];
        const sub = service.notifications$.subscribe((values) => (notifications = values));

        service.showGameOverNotification('Test Winner');
        expect(notifications.length).toBe(1);
        expect(notifications[0].type).toBe('gameOver');
        expect(notifications[0].message).toBe('Le grand vainqueur est : Test Winner');

        sub.unsubscribe();
    }));

    it('should handle game over notification when all players left', fakeAsync(() => {
        let notifications: CombatNotification[] = [];
        const sub = service.notifications$.subscribe((values) => (notifications = values));

        service.showGameOverNotification();
        expect(notifications.length).toBe(1);
        expect(notifications[0].type).toBe('gameOver');
        expect(notifications[0].message).toBe('Fin de partie, Tous les joueurs sont partis!');

        service.showGameOverNotification('   ');
        expect(notifications.length).toBe(1);
        expect(notifications[0].type).toBe('gameOver');
        expect(notifications[0].message).toBe('Fin de partie, Tous les joueurs sont partis!');

        sub.unsubscribe();
    }));

    it('should handle game over notification with undefined winner', fakeAsync(() => {
        let notifications: CombatNotification[] = [];
        const sub = service.notifications$.subscribe((values) => (notifications = values));

        service.showGameOverNotification(undefined);
        expect(notifications.length).toBe(1);
        expect(notifications[0].type).toBe('gameOver');
        expect(notifications[0].message).toBe('Fin de partie, Tous les joueurs sont partis!');

        sub.unsubscribe();
    }));

    it('should handle game over notification with empty winner name', fakeAsync(() => {
        let notifications: CombatNotification[] = [];
        const sub = service.notifications$.subscribe((values) => (notifications = values));

        service.showGameOverNotification('   ');
        expect(notifications.length).toBe(1);
        expect(notifications[0].type).toBe('gameOver');
        expect(notifications[0].message).toBe('Fin de partie, Tous les joueurs sont partis!');

        sub.unsubscribe();
    }));
});

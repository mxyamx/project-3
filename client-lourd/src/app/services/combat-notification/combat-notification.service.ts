import { Injectable, effect, inject } from '@angular/core';
import {
    COMBAT_NOTIFICATION_ID,
    INTERFACE_CLOSE_DELAY,
    NOTIFICATION_ANIMATION_DURATION,
    NOTIFICATION_DISPLAY_TIME,
    TURN_NOTIFICATION_ID,
} from '@app/constants/development-constants';
import { GameInterfaceService } from '@app/services/game-interface/game-interface.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { PlayerState } from '@common/enums/player-state';
import { BehaviorSubject, Observable } from 'rxjs';

export interface CombatNotification {
    id: string;
    message: string;
    icon: string;
    type: 'victory' | 'defeat' | 'turnTransition' | 'gameOver';
    isVisible: boolean;
    position?: 'top' | 'bottom';
}
@Injectable({
    providedIn: 'root',
})
export class CombatNotificationService {
    notifications$: Observable<CombatNotification[]>;

    private gameSessionManagerService = inject(GameSessionManagerService);
    private gameInterfaceService = inject(GameInterfaceService);
    private notificationsSubject = new BehaviorSubject<CombatNotification[]>([]);
    private interfaceCloseTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        this.notifications$ = this.notificationsSubject.asObservable();
        effect(() => {
            if (this.gameSessionManagerService.leavingGame$()) {
                this.clearNotifications();
            }
        });
    }

    showVictoryNotification() {
        this.addNotification({
            id: COMBAT_NOTIFICATION_ID,
            message: 'Félicitations ! Vous avez gagné',
            icon: 'fas fa-trophy',
            type: 'victory',
            isVisible: true,
            position: 'top',
        });

        this.handleCombatNotificationLifecycle();
    }

    showDefeatNotification() {
        this.addNotification({
            id: COMBAT_NOTIFICATION_ID,
            message: 'Vous êtes nul ! Vous avez perdu',
            icon: 'fas fa-skull',
            type: 'defeat',
            isVisible: true,
            position: 'top',
        });

        this.handleCombatNotificationLifecycle();
    }

    showTurnTransition() {
        if (this.gameSessionManagerService.playerState() === PlayerState.EndGame) {
            return;
        }

        const playerName = this.gameSessionManagerService.activePlayer().name;

        this.addNotification({
            id: TURN_NOTIFICATION_ID,
            message: `C'est le tour de : ${playerName}`,
            icon: 'fas fa-user-clock',
            type: 'turnTransition',
            isVisible: true,
            position: 'bottom',
        });
    }

    showGameOverNotification(winnerName?: string) {
        const message = winnerName?.trim() ? `Le grand vainqueur est : ${winnerName}` : 'Fin de partie, Tous les joueurs sont partis!';

        this.addNotification({
            id: COMBAT_NOTIFICATION_ID,
            message,
            icon: winnerName ? 'fas fa-crown' : '',
            type: 'gameOver',
            isVisible: true,
            position: 'top',
        });

        this.handleCombatNotificationLifecycle();
    }

    hideTurnTransition() {
        this.hideNotification(TURN_NOTIFICATION_ID);
    }

    hideDefeatNotification() {
        this.hideNotification(COMBAT_NOTIFICATION_ID);
    }

    hideVictoryNotification() {
        this.hideNotification(COMBAT_NOTIFICATION_ID);
    }

    hideGameOverNotification() {
        this.hideNotification(COMBAT_NOTIFICATION_ID);
    }

    private handleCombatNotificationLifecycle() {
        if (this.interfaceCloseTimeout) {
            clearTimeout(this.interfaceCloseTimeout);
            this.interfaceCloseTimeout = null;
        }

        setTimeout(() => {
            this.hideNotification(COMBAT_NOTIFICATION_ID);
        }, NOTIFICATION_DISPLAY_TIME);

        this.interfaceCloseTimeout = setTimeout(() => {
            this.gameInterfaceService.hideInterface();
            this.interfaceCloseTimeout = null;
        }, INTERFACE_CLOSE_DELAY);
    }

    private addNotification(notification: CombatNotification) {
        const currentNotifications = this.notificationsSubject.getValue();
        const updatedNotifications = currentNotifications.filter((n) => n.id !== notification.id).concat(notification);
        this.notificationsSubject.next(updatedNotifications);
    }

    private hideNotification(id: string) {
        const currentNotifications = this.notificationsSubject.getValue();
        const updatedNotifications = currentNotifications.map((n) => (n.id === id ? { ...n, isVisible: false } : n));
        this.notificationsSubject.next(updatedNotifications);

        setTimeout(() => {
            const notifications = this.notificationsSubject.getValue();
            this.notificationsSubject.next(notifications.filter((n) => n.id !== id || n.isVisible));
        }, NOTIFICATION_ANIMATION_DURATION);
    }

    private clearNotifications(): void {
        if (this.interfaceCloseTimeout) {
            clearTimeout(this.interfaceCloseTimeout);
            this.interfaceCloseTimeout = null;
        }
        this.notificationsSubject.next([]);
    }
}

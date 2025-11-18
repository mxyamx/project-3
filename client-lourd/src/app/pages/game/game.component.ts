import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ChatContainerComponent } from '@app/components/chat-container/chat-container.component';
import { CombatNotificationComponent } from '@app/components/combat-notification/combat-notification/combat-notification.component';
import { CountdownComponent } from '@app/components/countdown/countdown.component';
import { EventLogComponent } from '@app/components/event-log/event-log.component';
import { GameInfoComponent } from '@app/components/game-info/game-info.component';
import { GameInterfaceComponent } from '@app/components/game-interface/game-interface.component';
import { InventoryComponent } from '@app/components/inventory/inventory.component';
import { PlayerInfoComponent } from '@app/components/player-info/player-info.component';
import { PlayingBoardComponent } from '@app/components/playing-board/playing-board.component';
import { ChatService } from '@app/services/chat/chat.service';
import { CombatNotificationService } from '@app/services/combat-notification/combat-notification.service';
import { GameInterfaceService } from '@app/services/game-interface/game-interface.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { GameSocketEventService } from '@app/services/game-socket-event/game-socket-event.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { PlayerState } from '@common/enums/player-state';
import { UrlPage } from '@common/enums/url-page';
import { Player } from '@common/player';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-game',
    standalone: true,
    imports: [
        RouterModule,
        CountdownComponent,
        PlayerInfoComponent,
        GameInfoComponent,
        EventLogComponent,
        InventoryComponent,
        GameInterfaceComponent,
        PlayingBoardComponent,
        CombatNotificationComponent,
        ChatContainerComponent,
        TranslatePipe,
    ],
    templateUrl: './game.component.html',
    styleUrl: './game.component.scss',
})
export class GameComponent implements OnInit, OnDestroy {
    showChat = false;
    showGameInterface = false;
    showAbandonConfirmation = false;
    showEndTurnConfirmation = false;
    gameSessionManager: GameSessionManagerService = inject(GameSessionManagerService);
    chatService = inject(ChatService);
    private router: Router;
    private subscription: Subscription;
    private gameSocketEventManager: GameSocketEventService = inject(GameSocketEventService);
    private playerSocketService: PlayerSocketService = inject(PlayerSocketService);
    private notificationService: CombatNotificationService = inject(CombatNotificationService);
    private gameInterfaceService: GameInterfaceService = inject(GameInterfaceService);

    constructor() {
        this.router = new Router();
        this.gameSocketEventManager.configureBaseSocket(this.router);
        this.gameSessionManager.init();
    }

    @HostListener('window:keydown', ['$event'])
    onKeydown(event: KeyboardEvent) {
        const target = event.target as HTMLElement;
        const isInputField = ['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable;

        if (isInputField) return;

        if (event.key === 'd' || event.key === 'D') {
            this.gameSessionManager.toggleDebugMode();
        }
    }

    ngOnInit() {
        this.gameSocketEventManager.gameEnding = false;
        this.subscription = this.gameInterfaceService.isInterfaceVisible$.subscribe((isVisible) => {
            this.showGameInterface = isVisible;
        });

        this.playerSocketService.onPlayerLeft((player: Player) => {
            if (this.gameSessionManager.isCurrentPlayer(player)) {
                this.router.navigate([UrlPage.Home]);
            }
        });
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }

        if (!this.gameSocketEventManager.gameEnding) {
            this.playerSocketService.emitLeaveGame(this.gameSessionManager.gameId());
            this.playerSocketService.unsubscribeGameEvents();
        }
    }

    toggleView(showChat: boolean) {
        this.showChat = showChat;
    }

    toggleGameInterface() {
        this.gameInterfaceService.showInterface();
    }

    onActionClick() {
        if (!this.gameSessionManager.actionActivated()) {
            if (this.gameSessionManager.nbOfActions() <= 0) return;
            this.gameSessionManager.activateAction();
            this.gameSessionManager.setActionStatus();
        } else {
            this.gameSessionManager.deactivateAction();
        }
    }
    confirmEndTurn() {
        this.showEndTurnConfirmation = true;
    }

    cancelEndTurn() {
        this.showEndTurnConfirmation = false;
    }

    onCLickEndTurn() {
        this.showEndTurnConfirmation = false;
        this.gameSessionManager.endTurn();
    }

    confirmAbandon() {
        this.showAbandonConfirmation = true;
    }

    cancelAbandon() {
        this.showAbandonConfirmation = false;
    }

    abandonGame() {
        const timeToHideNotifications = 800;
        const timeToChangePage = 1000;
        this.showAbandonConfirmation = false;
        const player = this.gameSessionManager.chosenPlayer();
        if (player) {
            this.playerSocketService.emitLeaveGame(this.gameSessionManager.gameId());
        }
        this.gameSessionManager.leaveGame();
        setTimeout(() => {
            this.hideNotifications();
        }, timeToHideNotifications);
        setTimeout(() => {
            this.router.navigate([UrlPage.Home]);
        }, timeToChangePage);
    }

    isActionButtonDisabled(): boolean {
        return this.gameSessionManager.playerState() !== PlayerState.WaitingForAction || this.gameSessionManager.nbOfActions() <= 0;
    }

    isEndTurnButtonDisabled(): boolean {
        return this.gameSessionManager.playerState() !== PlayerState.WaitingForAction;
    }

    private hideNotifications(): void {
        this.gameInterfaceService.hideInterface();
        this.gameInterfaceService.hideEscapeConfirmation();
        this.notificationService.hideTurnTransition();
        this.notificationService.hideDefeatNotification();
        this.notificationService.hideVictoryNotification();
    }
}

import { Component, HostListener, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
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
import { GameEventService } from '@app/services/game-event/game-event.service';
import { GameInterfaceService } from '@app/services/game-interface/game-interface.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { GameSocketEventService } from '@app/services/game-socket-event/game-socket-event.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { UserStatusService } from '@app/services/user-status/user-status.service';
import { GameActivityStatus } from '@common/enums/game-activity-status';
import { PlayerState } from '@common/enums/player-state';
import { UrlPage } from '@common/enums/url-page';
import { EventLog } from '@common/game-event';
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
    showEmoteMenuForPlayer = false;
    gameSessionManager: GameSessionManagerService = inject(GameSessionManagerService);
    chatService = inject(ChatService);
    gameIdCopy: string = '';
    @ViewChild(EventLogComponent) logComponent!: EventLogComponent;
    private router: Router;
    private subscription: Subscription;
    private gameSocketEventManager: GameSocketEventService = inject(GameSocketEventService);
    private playerSocketService: PlayerSocketService = inject(PlayerSocketService);
    private notificationService: CombatNotificationService = inject(CombatNotificationService);
    private gameInterfaceService: GameInterfaceService = inject(GameInterfaceService);
    private userStatusService: UserStatusService = inject(UserStatusService);
    private gameEventService = inject(GameEventService);

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
        this.playerSocketService.onChangeLog((event: EventLog) => {
            this.gameEventService.addLog(event);
            if (this.showChat && !this.chatService.chatDetache()) {
                return;
            }
            this.logComponent.bottom();
        });
        this.playerSocketService.onCombatLog((gameEvent: EventLog) => {
            this.gameEventService.addLog(gameEvent);
            if (this.showChat && !this.chatService.chatDetache()) {
                return;
            }
            this.logComponent.bottom();
        });
        this.playerSocketService.emitJoinLogRoom(this.gameSessionManager.gameId(), (response: EventLog[]) => {
            this.gameEventService.setLogs(response);
            if (this.showChat && !this.chatService.chatDetache()) {
                return;
            }
            this.logComponent.bottom();
            return;
        });

        this.playerSocketService.onPlayerLeft((player: Player) => {
            if (this.gameSessionManager.isCurrentPlayer(player)) {
                this.userStatusService.updateMyGameActivity(GameActivityStatus.idle);
                this.router.navigate([UrlPage.Home]);
            }
        });
        this.gameIdCopy = this.gameSessionManager.gameId();
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }

        if (!this.gameSocketEventManager.gameEnding) {
            this.playerSocketService.emitLeaveGame(this.gameSessionManager.gameId());
            this.userStatusService.updateMyGameActivity(GameActivityStatus.idle);
            this.playerSocketService.unsubscribeGameEvents();
            if (this.chatService.chatDetache()) {
                this.chatService.leaveGameChat(this.gameIdCopy);
            }
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
    toggleEmoteMenu() {
        console.log('🎯 [GameComponent] toggleEmoteMenu appelé');
        console.log('   Valeur actuelle:', this.showEmoteMenuForPlayer);

        this.showEmoteMenuForPlayer = true;
        console.log('   Nouvelle valeur:', this.showEmoteMenuForPlayer);

        setTimeout(() => {
            this.showEmoteMenuForPlayer = false;
            console.log('   Valeur réinitialisée à false');
        }, 100);
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
            this.userStatusService.updateMyGameActivity(GameActivityStatus.idle);
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

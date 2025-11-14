import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ChatContainerComponent } from '@app/components/chat-container/chat-container.component';
import { PlayersListComponent } from '@app/components/players-list/players-list';
import { EMPTY_CODE } from '@app/constants/development-constants';
import { ChatDockService } from '@app/services/chat-dock/chat-dock.service';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { CurrentGameManagerService } from '@app/services/current-game-manager/current-game-manager.service';
import { GameEventService } from '@app/services/game-event/game-event.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { HttpUserService } from '@app/services/http-manager/http-users.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { StatisticsManagerService } from '@app/services/statistics-manager/statistics-manager.service';
import { UserManagerService } from '@app/services/user-manager/user-manager.service';
import { CurrentGame } from '@common/current-game';
import { GameMode } from '@common/enums/game-mode';
import { PlayerLimits } from '@common/enums/players-limit';
import { SocketClientEventNames } from '@common/enums/socket-events-names';
import { UrlPage } from '@common/enums/url-page';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import { GameEvent } from '@common/game-event';
import { Player } from '@common/player';
import * as socketDataForm from '@common/socket-data-forms';
import { User } from '@common/user';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-waiting-page',
    imports: [PlayersListComponent, CommonModule, ChatContainerComponent, TranslatePipe],
    templateUrl: './waiting-page.component.html',
    styleUrl: './waiting-page.component.scss',
})
export class WaitingPageComponent implements OnInit, OnDestroy {
    gameId: string | null;
    currentGame: CurrentGame;
    showTooltip: boolean = false;
    showDropInTooltip: boolean = false;
    roomLockedState: boolean = false;
    dropInEnabled: boolean = false;
    playersLimitReached: boolean = false;
    hasBeenClicked: boolean = false;
    hasToggleState: boolean = false;
    hasToggleStateDropIn: boolean = false;
    gameSessionManager: GameSessionManagerService = inject(GameSessionManagerService);
    showPlayerAmountWarning = false;
    chatDockService: ChatDockService = inject(ChatDockService);
    isStartingGame: boolean = false;
    protected showVirtualPlayerProfile: boolean = false;
    protected virtualPlayerProfile = VirtualPlayerProfile;

    entryPrice: number = 25;

    private currentGameManager = inject(CurrentGameManagerService);
    private socketManager: SocketClientService = inject(SocketClientService);
    private playerSocketService = inject(PlayerSocketService);
    private httpUserService = inject(HttpUserService);
    private userManagerService: UserManagerService = inject(UserManagerService);
    private statisticsManager: StatisticsManagerService = inject(StatisticsManagerService);
    private gameEventService: GameEventService = inject(GameEventService);

    constructor(private router: Router) {
        this.configureSocketBase();
    }

    ngOnInit() {
        this.gameId = this.currentGameManager.displayedCurrentGame().id;
        if (this.gameId) {
            this.playerSocketService.emitGetGame(this.gameId, (response: CurrentGame) => {
                if (response) {
                    this.currentGame = response;
                    this.roomLockedState = response.locked;
                    this.entryPrice = response.entryPrice;
                    this.dropInEnabled = response.dropInEnabled;
                    this.playersLimitReached = this.playerlimit();
                    this.automaticLock();
                }
            });
        }

        this.playerSocketService.onPlayerJoined((player: Player) => {
            if (!this.currentGame.players.includes(player)) {
                this.currentGame.players = [...this.currentGame.players, player];
            }
            this.playersLimitReached = this.playerlimit();
        });

        this.playerSocketService.onPlayerLeft((player: Player) => {
            this.currentGame.players = this.currentGame.players.filter((leftPlayer) => leftPlayer.name !== player.name);
            this.playersLimitReached = this.playerlimit();
        });

        this.playerSocketService.onKicked((player: Player) => {
            this.chatDockService.leftGame();
            this.currentGame.players = this.currentGame.players.filter((kickedPlayer) => kickedPlayer.name !== player.name);
            this.playersLimitReached = this.playerlimit();
        });

        this.playerSocketService.onLockUpdated((game: CurrentGame) => {
            if (game.id === this.gameId) {
                this.hasToggleState = false;
                this.currentGame = game;
                this.roomLockedState = game.locked;
            }
        });

        this.playerSocketService.onDropInUpdated((game: CurrentGame) => {
            if (game.id === this.gameId) {
                this.hasToggleStateDropIn = false;
                this.currentGame = game;
                this.dropInEnabled = game.dropInEnabled;
            }
        });
    }

    ngOnDestroy(): void {
        if (!this.isStartingGame && this.gameId) {
            this.playerSocketService.emitLeaveGame(this.gameId);
            this.playerSocketService.unsubscribeGameEvents();
        }
    }

    toggleRoomState() {
        if (this.gameId) {
            const maxPlayers = PlayerLimits[this.currentGame.boardGame.size].maxPlayers;
            const isRoomFull = this.currentGame.players.length >= maxPlayers;

            if (this.currentGame.locked && isRoomFull) {
                return;
            }

            this.hasToggleState = true;
            this.playerSocketService.emitToggleLock(this.gameId, (locked: boolean) => {
                if (this.currentGame) {
                    this.currentGame.locked = locked;
                    this.roomLockedState = locked;
                }
            });
        }
    }

    toggleDropIn() {
        if (this.gameId) {
            this.hasToggleStateDropIn = true;
            this.playerSocketService.emitToggleDropIn(this.gameId, (dropInEnabled: boolean) => {
                if (this.currentGame) {
                    this.currentGame.dropInEnabled = dropInEnabled;
                    this.dropInEnabled = dropInEnabled;
                }
            });
        }
    }

    automaticLock() {
        if (this.currentGame) {
            const maxPlayers = PlayerLimits[this.currentGame.boardGame.size].maxPlayers;
            const automaticLock = this.currentGame.players.length >= maxPlayers;

            if (automaticLock !== this.currentGame.locked) {
                this.toggleRoomState();
            }
        }
    }

    startGame() {
        if (this.currentGame) {
            if (this.currentGame.players.length % 2 !== 0 && this.currentGame.boardGame.gameMode === GameMode.CTF) {
                this.showPlayerAmountWarning = true;
                return;
            }
        }
        if (this.gameId && this.isOrganizer()) {
            this.playerSocketService.emitUpdateGameStart(this.gameId);
            this.playerSocketService.emitStartGame(this.gameId);
        }
        this.hasBeenClicked = true;
    }

    leaveGame() {
        if (this.isOrganizer()) {
            this.playerSocketService.emitAdminLeaving(this.currentGame.id);
        }
        console.log('leaving game');

        if (this.currentGame.entryPrice > 0) {
            console.log('leaving game after if check');
            console.log(`current game entry price: ${this.currentGame.entryPrice}`);

            const user = this.userManagerService.getCurrentUser();
            const newMoney = user.money + this.currentGame.entryPrice;
            const updatedUser: User = { ...user, money: newMoney };

            this.httpUserService.updateUser(updatedUser).subscribe({
                next: () => {
                    // Update local state
                    this.userManagerService.setMoney(newMoney);

                    this.finalizeLeave();
                },
                error: (err) => {
                    console.error('Failed to refund:', err);
                    // optional: show a toast
                    this.finalizeLeave();
                },
            });
        } else {
            this.finalizeLeave();
        }
    }

    playerlimit(): boolean {
        const minPlayers = PlayerLimits[this.currentGame.boardGame.size].minPlayers;
        return this.currentGame.players.length < minPlayers;
    }

    isOrganizer(): boolean {
        const currentPlayer = this.gameSessionManager.chosenPlayer();
        return currentPlayer?.organizer;
    }

    isRoomFull(): boolean {
        const maxPlayers = PlayerLimits[this.currentGame.boardGame.size].maxPlayers;
        return this.currentGame.players.length >= maxPlayers;
    }

    configureSocketBase(): void {
        this.socketManager.on(SocketClientEventNames.StartGame, (data: socketDataForm.StartGameData) => {
            if (data.boardGame && data.listOfPlayers) {
                this.gameSessionManager.updateListOfPlayers(data.listOfPlayers);
                this.gameEventService.retrieveNumberOfPlayersInit(data);
                this.gameSessionManager.updateBoardGame(data.boardGame);
                this.gameSessionManager.updateActivePlayer(data.activePlayer);
                this.gameSessionManager.updateDisplayedList(structuredClone(data.listOfPlayers));
                this.statisticsManager.reset();
                this.isStartingGame = true;

                this.router.navigate([UrlPage.Game]);

                const newChosenPlayer: Player | undefined = data.listOfPlayers.find((player: Player) => {
                    return player.name === this.gameSessionManager.chosenPlayer().name;
                });
                if (newChosenPlayer) this.gameSessionManager.updateChosenPlayer(newChosenPlayer);
                if (data.activePlayer.name === this.gameSessionManager.chosenPlayer().name) {
                    this.gameEventService.showFirstTurnNotification(data);
                }
            } else {
                this.router.navigate([UrlPage.Error]);
            }
            this.playerSocketService.onChangeLog((gameEvent: GameEvent) => {
                this.gameEventService.addLog(gameEvent);
            });
        });

        this.socketManager.on(SocketClientEventNames.ServerError, () => {
            this.gameSessionManager.updateGameId(EMPTY_CODE);
            this.router.navigate([UrlPage.Error]);
        });
    }

    onGenerateVirtualPlayerClick() {
        this.showVirtualPlayerProfilePopup();
    }

    showVirtualPlayerProfilePopup() {
        this.showVirtualPlayerProfile = true;
    }

    hideVirtualPlayerProfilePopup() {
        this.showVirtualPlayerProfile = false;
    }

    selectProfile(profile: VirtualPlayerProfile) {
        if (this.gameId) {
            this.playerSocketService.emitAddVirtualPlayer(this.gameId, profile);
        }
        this.hideVirtualPlayerProfilePopup();
    }

    private finalizeLeave() {
        // this.playerSocketService.emitLeaveGame(this.currentGame.id);
        this.router.navigate(['/main-page']);
    }
}

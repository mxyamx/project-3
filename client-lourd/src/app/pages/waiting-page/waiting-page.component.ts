import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ChatContainerComponent } from '@app/components/chat-container/chat-container.component';
import { PlayersListComponent } from '@app/components/players-list/players-list';
import { EMPTY_CODE } from '@app/constants/development-constants';
import { ChatDockService } from '@app/services/chat-dock/chat-dock.service';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { CurrentGameManagerService } from '@app/services/current-game-manager/current-game-manager.service';
import { GameEventService } from '@app/services/game-event/game-event.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { StatisticsManagerService } from '@app/services/statistics-manager/statistics-manager.service';
import { CurrentGame } from '@common/current-game';
import { GameMode } from '@common/enums/game-mode';
import { PlayerLimits } from '@common/enums/players-limit';
import { SocketClientEventNames } from '@common/enums/socket-events-names';
import { UrlPage } from '@common/enums/url-page';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import { GameEvent } from '@common/game-event';
import { Player } from '@common/player';
import * as socketDataForm from '@common/socket-data-forms';

@Component({
    selector: 'app-waiting-page',
    imports: [RouterLink, PlayersListComponent, CommonModule, ChatContainerComponent],
    templateUrl: './waiting-page.component.html',
    styleUrl: './waiting-page.component.scss',
})
export class WaitingPageComponent implements OnInit {
    gameId: string | null;
    currentGame: CurrentGame;
    showTooltip: boolean = false;
    roomLockedState: boolean = false;
    playersLimitReached: boolean = false;
    hasBeenClicked: boolean = false;
    hasToggleState: boolean = false;
    gameSessionManager: GameSessionManagerService = inject(GameSessionManagerService);
    showPlayerAmountWarning = false;
    chatDockService: ChatDockService = inject(ChatDockService);
    protected showVirtualPlayerProfile: boolean = false;
    protected virtualPlayerProfile = VirtualPlayerProfile;

    private currentGameManager = inject(CurrentGameManagerService);
    private socketManager: SocketClientService = inject(SocketClientService);
    private playerSocketService = inject(PlayerSocketService);
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

    deletePlayer(player: Player) {
        if (this.gameId) {
            this.chatDockService.leftGame();
            this.playerSocketService.emitLeaveGame(this.gameId, player);
        }
        this.router.navigate([UrlPage.Home]);
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
                this.statisticsManager.setStartTime();
                this.statisticsManager.updateNumberTurns();

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
            this.socketManager.disconnect();
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
}

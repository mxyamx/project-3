import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CurrentGameManagerService } from '@app/services/current-game-manager/current-game-manager.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { CurrentGame } from '@common/current-game';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import { Player } from '@common/player';
import { VirtualPlayer } from '@common/virtual-player';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-players-list',
    standalone: true,
    imports: [CommonModule, TranslatePipe],
    templateUrl: './players-list.html',
    styleUrls: ['./players-list.scss'],
})
export class PlayersListComponent implements OnInit {
    @Input() gameId: string | null;
    playersList: Player[] = [];
    selectedPlayer: Player | null;
    showAlertConfirmation: boolean = false;
    showAlertOfAdminLeft: boolean = false;
    protected virtualPlayerProfile = VirtualPlayerProfile;
    private playerSocketService = inject(PlayerSocketService);
    private currentGameManager = inject(CurrentGameManagerService);
    private gameSessionManager = inject(GameSessionManagerService);

    constructor(private router: Router) {}

    ngOnInit(): void {
        if (this.gameId) {
            this.playerSocketService.emitGetGame(this.gameId, (game: CurrentGame) => {
                if (game) {
                    this.playersList = [...game.players];
                }
            });

            this.playerSocketService.onPlayerJoined((player: Player) => {
                this.currentGameManager.addPlayer(player);
                this.playersList = [...this.playersList, player];
            });

            this.playerSocketService.onPlayerLeft((player: Player) => {
                this.playersList = this.playersList.filter((leftPlayer) => leftPlayer.name !== player.name);
                this.currentGameManager.removePlayer(player);

                if (this.gameSessionManager.isCurrentPlayer(player)) {
                    this.playerSocketService.disconnect();
                    this.playersList = [];
                    this.currentGameManager.reset();
                    this.router.navigate(['/home']);
                }
            });

            this.playerSocketService.onKicked((player: Player) => {
                this.playersList = this.playersList.filter((kickedPlayer) => kickedPlayer.name !== player.name);
                this.currentGameManager.removePlayer(player);

                if (this.gameSessionManager.isCurrentPlayer(player)) {
                    this.playerSocketService.disconnect();
                    this.playersList = [];
                    this.currentGameManager.reset();
                    this.showAlertConfirmation = true;
                }
            });

            this.playerSocketService.onAdminLeft(() => {
                this.playersList = [];
                this.currentGameManager.reset();
                this.showAlertOfAdminLeft = true;
            });
        }
    }

    openPlayerModal(player: Player) {
        this.selectedPlayer = player;
    }

    closePlayerModal() {
        this.selectedPlayer = null;
    }

    hideAlert() {
        this.router.navigate(['/home']);
        this.showAlertConfirmation = false;
        this.showAlertOfAdminLeft = false;
    }

    deletePlayer(player: Player) {
        if (this.gameId) {
            this.playerSocketService.emitLeaveGame(this.gameId, player);
        }
        this.closePlayerModal();
    }

    kickPlayer(player: Player) {
        if (this.gameId) {
            this.playerSocketService.emitKickPlayer(this.gameId, player);
        }
        this.closePlayerModal();
    }

    isOrganizer(): boolean {
        const currentPlayer = this.gameSessionManager.chosenPlayer();
        return currentPlayer?.organizer;
    }

    showAlert(): boolean {
        return this.showAlertConfirmation || this.showAlertOfAdminLeft;
    }

    isAggressive(player: Player): boolean {
        if (player.virtualPlayer) {
            return (player as VirtualPlayer).profile === VirtualPlayerProfile.Agressive;
        }
        return false;
    }
}

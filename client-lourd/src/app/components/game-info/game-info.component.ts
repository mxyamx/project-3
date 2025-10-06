import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy, SimpleChanges, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { STANDARD_GAME_NAME, STANDARD_PLAYERS } from '@app/constants/development-constants';
import { FROM_BOARD_SIZE_TO_LABEL } from '@app/constants/objects-constants';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { CurrentGame } from '@common/current-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { GameMode } from '@common/enums/game-mode';
import { ItemName } from '@common/enums/item-name';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import { Player } from '@common/player';
import { VirtualPlayer } from '@common/virtual-player';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-game-info',
    standalone: true,
    imports: [CommonModule, TranslatePipe],
    templateUrl: './game-info.component.html',
    styleUrl: './game-info.component.scss',
})
export class GameInfoComponent implements OnChanges, OnDestroy {
    @Input() gameId: string | null;
    gameName: string = STANDARD_GAME_NAME;
    activePlayerName: string = '';
    players: Player[] = [];
    boardSize: BoardGameSize;
    gameMode: GameMode | undefined;
    boardSizeCorrespondance: { [key: string]: string } = FROM_BOARD_SIZE_TO_LABEL;
    private mockPlayers: Player[] = STANDARD_PLAYERS;
    private gameSessionManager = inject(GameSessionManagerService);
    private playerSocketService = inject(PlayerSocketService);
    private initialPlayersSpeeds: Map<string, number> = new Map();

    private subscriptions: Subscription = new Subscription();

    constructor() {
        this.subscriptions.add(
            toObservable(this.gameSessionManager.activePlayer).subscribe((activePlayer) => {
                if (activePlayer?.name) {
                    this.activePlayerName = activePlayer.name;
                }
            }),
        );

        this.subscriptions.add(
            toObservable(this.gameSessionManager.displayedPlayerList).subscribe((sessionPlayers) => {
                if (sessionPlayers?.length) {
                    this.updatePlayersList([...sessionPlayers]);
                }
            }),
        );
    }

    ngOnDestroy() {
        this.subscriptions.unsubscribe();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['gameId']) {
            if (!this.gameId || this.gameId === '0000') {
                this.useMockPlayers();
            } else {
                this.getGameData();
            }
        }
    }

    getGameData(): void {
        if (this.gameId) {
            this.playerSocketService.emitGetGame(this.gameId, (game: CurrentGame) => {
                if (!game) {
                    this.useMockPlayers();
                    return;
                }

                this.gameSessionManager.gameId.set(this.gameId as string);
                this.gameName = game.name || game.boardGame?.name || STANDARD_GAME_NAME;
                this.boardSize = game.boardGame?.size;
                this.gameMode = game.boardGame?.gameMode;

                const sessionPlayers = this.gameSessionManager.displayedPlayerList();
                if (sessionPlayers && sessionPlayers.length > 0) {
                    this.updatePlayersList([...sessionPlayers]);
                }
            });
        }
    }

    hasFlag(player: Player) {
        return player?.inventory?.some((item) => item.name === ItemName.Flag);
    }

    isCtfMode() {
        return this.gameMode === GameMode.CTF;
    }

    protected isAggressive(player: Player): boolean {
        if (player.virtualPlayer) {
            return (player as VirtualPlayer).profile === VirtualPlayerProfile.Agressive;
        }
        return false;
    }

    private useMockPlayers() {
        const sessionPlayers = this.gameSessionManager.listOfPlayers();
        if (sessionPlayers && sessionPlayers.length > 0) {
            this.updatePlayersList([...sessionPlayers]);
        } else {
            this.updatePlayersList([...this.mockPlayers]);
        }

        const activePlayer = this.gameSessionManager.activePlayer();
        if (activePlayer && activePlayer.name) {
            this.activePlayerName = activePlayer.name;
        }
    }

    private updatePlayersList(players: Player[]): void {
        for (const player of players) {
            if (!this.initialPlayersSpeeds.has(player.name)) {
                this.initialPlayersSpeeds.set(player.name, player.attributes.speedValue);
            }
        }

        this.players = this.sortPlayersByInitialSpeedAndName(players);
    }

    private sortPlayersByInitialSpeedAndName(players: Player[]): Player[] {
        return players.sort((a, b) => {
            const speedA = this.initialPlayersSpeeds.get(a.name) || a.attributes.speedValue;
            const speedB = this.initialPlayersSpeeds.get(b.name) || b.attributes.speedValue;

            if (speedB !== speedA) {
                return speedB - speedA;
            }

            return a.name.localeCompare(b.name);
        });
    }
}

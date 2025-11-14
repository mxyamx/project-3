import { CommonModule } from '@angular/common';
import { Component, OnInit, WritableSignal, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { GameListComponent } from '@app/components/game-list/game-list.component';
import { LoadingComponent } from '@app/components/loading/loading.component';
import { CurrentGameManagerService } from '@app/services/current-game-manager/current-game-manager.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { HttpBoardGameService } from '@app/services/http-manager/http-board-game.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { UserManagerService } from '@app/services/user-manager/user-manager.service';
import { BoardGameDTO } from '@common/board-game';
import { GameMode } from '@common/enums/game-mode';
import { UrlPage } from '@common/enums/url-page';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-creation-page',
    imports: [RouterLink, CommonModule, GameListComponent, TranslatePipe, LoadingComponent],
    templateUrl: './creation-page.component.html',
    styleUrl: './creation-page.component.scss',
})
export class CreationPageComponent implements OnInit {
    showVisibilityAlert: boolean = false;
    showAlertConfirmation: boolean = false;
    gamesList: BoardGameDTO[] = [];
    displayedObject: BoardGameDTO | null = null;
    hasBeenClicked: boolean = false;
    gameManager: GameSessionManagerService = inject(GameSessionManagerService);
    userManagerService: UserManagerService = inject(UserManagerService);
    httpBoardGameService = inject(HttpBoardGameService);

    gameMode: typeof GameMode = GameMode;
    isLoading: WritableSignal<boolean> = signal(false);

    maxPollPrize: number = this.userManagerService.getCurrentUser().money;
    selectedPollPrizeAmount: number = 0;

    onPollPrizeChange(event: Event): void {
        const value = Number((event.target as HTMLInputElement).value);
        this.selectedPollPrizeAmount = value;
    }

    private currentGameService = inject(CurrentGameManagerService);
    private playerSocketService = inject(PlayerSocketService);
    constructor(private router: Router) {}

    async ngOnInit(): Promise<void> {
        await this.loadGames();
    }

    async loadGames(): Promise<void> {
        this.isLoading.set(true);
        try {
            const games: BoardGameDTO[] = await firstValueFrom(this.httpBoardGameService.getPlayableBoards());
            this.gamesList = games;
            if (this.gamesList.length > 0) {
                this.displayedObject = this.gamesList[0];
            }
        } finally {
            this.isLoading.set(false);
        }
    }

    setDisplayedObject(game: BoardGameDTO): void {
        this.displayedObject = this.gamesList.find((g) => g.id === game.id) || { ...game };
    }

    async hideAlert() {
        if (this.showVisibilityAlert || this.showAlertConfirmation) {
            this.showVisibilityAlert = false;
            this.showAlertConfirmation = false;
            await this.loadGames();
            this.hasBeenClicked = false;
            return;
        }
        this.showVisibilityAlert = false;
        this.showAlertConfirmation = false;
    }

    createNewGame() {
        if (!this.displayedObject) return;

        this.currentGameService.reset();

        const gameId = this.displayedObject.id;

        this.httpBoardGameService.getBoard(gameId).subscribe({
            next: (boardGame) => {
                if (!boardGame) {
                    this.showAlertConfirmation = true;
                    return;
                }

                this.currentGameService.updatePickedBoardGame(boardGame);
                const currentGame = this.currentGameService.displayedCurrentGame();
                this.playerSocketService.emitCreateGame(currentGame, (response: any) => {
                    if (response?.error) {
                        switch (response.error) {
                            case 'GAME_PRIVACY_CHANGED':
                                this.showVisibilityAlert = true;
                                break;
                            case 'GAME_NOT_FOUND':
                                this.showAlertConfirmation = true;
                                break;
                            default:
                                this.showAlertConfirmation = true;
                        }
                        this.hasBeenClicked = false;
                        return;
                    }

                    if (response?.success && response?.game) {
                        this.currentGameService.updateCurrentGame(response.game);
                        this.playerSocketService.emitJoinAvatarRoom(response.game.id);
                        this.router.navigate([UrlPage.Avatar]);
                    }
                });
            },
            error: () => {
                this.showAlertConfirmation = true;
                this.hasBeenClicked = false;
            },
        });
        this.hasBeenClicked = true;
    }
}

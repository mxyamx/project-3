import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { GameListComponent } from '@app/components/game-list/game-list.component';
import { CurrentGameManagerService } from '@app/services/current-game-manager/current-game-manager.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { HttpBoardGameService } from '@app/services/http-manager/http-board-game.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { BoardGame } from '@common/board-game';
import { CurrentGame } from '@common/current-game';
import { UrlPage } from '@common/enums/url-page';

@Component({
    selector: 'app-creation-page',
    imports: [RouterLink, CommonModule, GameListComponent],
    templateUrl: './creation-page.component.html',
    styleUrl: './creation-page.component.scss',
})
export class CreationPageComponent implements OnInit {
    showVisibilityAlert: boolean = false;
    showAlertConfirmation: boolean = false;
    gamesList: BoardGame[] = [];
    displayedObject: BoardGame | null = null;
    hasBeenClicked: boolean = false;
    gameManager: GameSessionManagerService = inject(GameSessionManagerService);
    httpBoardGameService = inject(HttpBoardGameService);
    private currentGameService = inject(CurrentGameManagerService);
    private playerSocketService = inject(PlayerSocketService);
    constructor(private router: Router) {}

    ngOnInit(): void {
        this.loadGames();
        this.playerSocketService.connect();
    }

    loadGames(): void {
        this.httpBoardGameService.getAllBoards().subscribe((games: BoardGame[]) => {
            this.gamesList = games.filter((game) => game.visibility);
            if (this.gamesList.length > 0) {
                this.displayedObject = this.gamesList[0];
            }
        });
    }

    setDisplayedObject(game: BoardGame): void {
        this.displayedObject = this.gamesList.find((g) => g.id === game.id) || { ...game };
    }

    hideAlert() {
        this.showAlertConfirmation = false;
        this.showVisibilityAlert = false;
    }

    createNewGame() {
        if (!this.displayedObject) return;

        this.currentGameService.reset();

        const gameId = this.displayedObject.id;
        const prevVisibility = this.displayedObject.visibility;

        this.httpBoardGameService.getBoard(gameId).subscribe({
            next: (boardGame) => {
                if (!boardGame) {
                    this.showAlertConfirmation = true;
                    return;
                }
                if (prevVisibility !== boardGame.visibility) {
                    this.showVisibilityAlert = true;
                    return;
                }

                this.currentGameService.updatePickedBoardGame(boardGame);
                const currentGame = this.currentGameService.displayedCurrentGame();
                this.playerSocketService.emitCreateGame(currentGame, (response: CurrentGame) => {
                    if (response) {
                        this.currentGameService.updateCurrentGame(response);
                        this.playerSocketService.emitJoinAvatarRoom(response.id);
                        this.router.navigate([UrlPage.Avatar]);
                    }
                });
            },
            error: () => {
                this.showAlertConfirmation = true;
            },
        });
        this.hasBeenClicked = true;
    }
}

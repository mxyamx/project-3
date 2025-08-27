import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { HttpBoardGameService } from '@app/services/http-manager/http-board-game.service';
import { BoardGame } from '@common/board-game';
import { UrlPage } from '@common/enums/url-page';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class AdminPageManagerService {
    readonly gamesList$: Observable<BoardGame[]>;
    readonly displayedObject$: Observable<BoardGame | null>;
    readonly showDeleteConfirmation$: Observable<boolean>;
    readonly showAlertConfirmation$: Observable<boolean>;

    private httpBoardGameService: HttpBoardGameService = inject(HttpBoardGameService);
    private boardGameManagerService: BoardGameManagerService = inject(BoardGameManagerService);
    private router: Router = inject(Router);

    private gamesListSubject: BehaviorSubject<BoardGame[]>;
    private displayedObjectSubject: BehaviorSubject<BoardGame | null>;
    private showDeleteConfirmationSubject: BehaviorSubject<boolean>;
    private showAlertConfirmationSubject: BehaviorSubject<boolean>;

    constructor() {
        this.gamesListSubject = new BehaviorSubject<BoardGame[]>([]);
        this.displayedObjectSubject = new BehaviorSubject<BoardGame | null>(null);
        this.showDeleteConfirmationSubject = new BehaviorSubject<boolean>(false);
        this.showAlertConfirmationSubject = new BehaviorSubject<boolean>(false);

        this.gamesList$ = this.gamesListSubject.asObservable();
        this.displayedObject$ = this.displayedObjectSubject.asObservable();
        this.showDeleteConfirmation$ = this.showDeleteConfirmationSubject.asObservable();
        this.showAlertConfirmation$ = this.showAlertConfirmationSubject.asObservable();
    }

    get gamesList(): BoardGame[] {
        return this.gamesListSubject.value;
    }

    get displayedObject(): BoardGame | null {
        return this.displayedObjectSubject.value;
    }

    loadGames(): Observable<BoardGame[]> {
        return this.httpBoardGameService.getAllBoards().pipe(
            tap((games: BoardGame[]) => {
                this.gamesListSubject.next(games);
                if (games.length > 0) {
                    this.displayedObjectSubject.next(games[0]);
                } else {
                    this.displayedObjectSubject.next(null);
                }
            }),
        );
    }

    setDisplayedObject(game: BoardGame): void {
        const foundGame = this.gamesList.find((g) => g.id === game.id);
        this.displayedObjectSubject.next(foundGame || { ...game });
    }

    confirmDelete(): void {
        this.showDeleteConfirmationSubject.next(true);
    }

    cancelDelete(): void {
        this.showDeleteConfirmationSubject.next(false);
    }

    hideAlert(): void {
        this.showAlertConfirmationSubject.next(false);
    }

    updateObjectVisibility(): Observable<BoardGame | null> {
        const currentObject = this.displayedObject;
        if (!currentObject) return of(null);

        const updatedGame: BoardGame = {
            ...currentObject,
            visibility: currentObject.visibility,
        };

        return this.httpBoardGameService.updateBoard(updatedGame).pipe(
            tap((game: BoardGame) => {
                const updatedList = [...this.gamesList];
                const index = updatedList.findIndex((g) => g.id === game.id);
                if (index !== -1) {
                    updatedList[index] = { ...game };
                }
                this.gamesListSubject.next(updatedList);
                this.displayedObjectSubject.next({ ...game });
            }),
        );
    }

    deleteGame(): Observable<boolean> {
        const currentObject = this.displayedObject;
        if (!currentObject) return of(false);

        const gameId = currentObject.id;

        return this.httpBoardGameService.getBoard(gameId).pipe(
            map(() => true),
            catchError(() => {
                this.showAlertConfirmationSubject.next(true);
                this.showDeleteConfirmationSubject.next(false);
                return of(false);
            }),
            tap((canDelete) => {
                if (canDelete) {
                    this.httpBoardGameService.deleteBoard(gameId).subscribe(() => {
                        this.showDeleteConfirmationSubject.next(false);
                        this.showAlertConfirmationSubject.next(false);

                        const filteredGames = this.gamesList.filter((game) => game.id !== gameId);
                        this.gamesListSubject.next(filteredGames);

                        const newDisplayedObject = filteredGames.length > 0 ? filteredGames[0] : null;
                        this.displayedObjectSubject.next(newDisplayedObject);
                    });
                }
            }),
        );
    }

    editGame(): boolean {
        const currentObject = this.displayedObject;
        if (!currentObject) return false;

        this.boardGameManagerService.updateDisplayedBoardGame(currentObject);
        this.boardGameManagerService.updateLoadedBoardGame(structuredClone(currentObject));
        this.router.navigate([UrlPage.Editor], { queryParams: { id: currentObject.id } });
        return true;
    }
}

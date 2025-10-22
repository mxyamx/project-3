import { Injectable, WritableSignal, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BoardGameManagerService } from '@app/services/board-game-manager/board-game-manager.service';
import { HttpBoardGameService } from '@app/services/http-manager/http-board-game.service';
import { BoardGame, BoardGameDTO } from '@common/board-game';
import { GamePrivacy } from '@common/enums/game-visibility';
import { UrlPage } from '@common/enums/url-page';
import { BehaviorSubject, Observable, catchError, firstValueFrom, map, of, tap } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class AdminPageManagerService {
    isLoading: WritableSignal<boolean> = signal(false);
    readonly gamesList$: Observable<BoardGame[]>;
    readonly displayedObject$: Observable<BoardGame | null>;
    readonly showDeleteConfirmation$: Observable<boolean>;
    readonly showAlertConfirmation$: Observable<boolean>;

    private httpBoardGameService: HttpBoardGameService = inject(HttpBoardGameService);
    private boardGameManagerService: BoardGameManagerService = inject(BoardGameManagerService);
    private router: Router = inject(Router);

    private gamesListSubject: BehaviorSubject<BoardGameDTO[]>;
    private displayedObjectSubject: BehaviorSubject<BoardGameDTO | null>;
    private showDeleteConfirmationSubject: BehaviorSubject<boolean>;
    private showAlertConfirmationSubject: BehaviorSubject<boolean>;

    constructor() {
        this.gamesListSubject = new BehaviorSubject<BoardGameDTO[]>([]);
        this.displayedObjectSubject = new BehaviorSubject<BoardGameDTO | null>(null);
        this.showDeleteConfirmationSubject = new BehaviorSubject<boolean>(false);
        this.showAlertConfirmationSubject = new BehaviorSubject<boolean>(false);

        this.gamesList$ = this.gamesListSubject.asObservable();
        this.displayedObject$ = this.displayedObjectSubject.asObservable();
        this.showDeleteConfirmation$ = this.showDeleteConfirmationSubject.asObservable();
        this.showAlertConfirmation$ = this.showAlertConfirmationSubject.asObservable();
    }

    get gamesList(): BoardGameDTO[] {
        return this.gamesListSubject.value;
    }

    get displayedObject(): BoardGameDTO | null {
        return this.displayedObjectSubject.value;
    }

    async loadGames(): Promise<void> {
        this.isLoading.set(true);
        try {
            const games: BoardGameDTO[] = await firstValueFrom(this.httpBoardGameService.getManageableBoards());
            this.gamesListSubject.next(games);
            if (games.length > 0) {
                this.displayedObjectSubject.next(games[0]);
            } else {
                this.displayedObjectSubject.next(null);
            }
        } finally {
            this.isLoading.set(false);
        }
    }

    setDisplayedObject(game: BoardGameDTO): void {
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

    updateObjectPrivacy(privacy: GamePrivacy): Observable<BoardGame | null> {
        const currentObject = this.displayedObject;
        if (!currentObject) return of(null);

        const updatedGame: BoardGameDTO = {
            ...currentObject,
            privacy,
        };

        const { ownerName, ...board } = updatedGame;
        const result: Omit<BoardGameDTO, 'ownerName'> = { ...board, ownerId: '' };

        return this.httpBoardGameService.updateBoard(result).pipe(
            tap(() => {
                const updatedList = [...this.gamesList];
                const index = updatedList.findIndex((g) => g.id === updatedGame.id);
                if (index !== -1) {
                    updatedList[index] = { ...updatedGame };
                }
                this.gamesListSubject.next(updatedList);
                this.displayedObjectSubject.next({ ...updatedGame });
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

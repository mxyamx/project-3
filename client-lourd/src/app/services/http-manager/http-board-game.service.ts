import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ErrorMessages, HttpStatus } from '@app/constants/http-status-constants';
import { BoardGame, BoardGameDTO } from '@common/board-game';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class HttpBoardGameService {
    private readonly apiUrl = environment.serverUrl;
    constructor(private http: HttpClient) {}

    getManageableBoards(): Observable<BoardGameDTO[]> {
        return this.http.get<BoardGameDTO[]>(`${this.apiUrl}/board-games/manageable/`).pipe(catchError(this.handleError));
    }
    getPlayableBoards(): Observable<BoardGameDTO[]> {
        return this.http.get<BoardGameDTO[]>(`${this.apiUrl}/board-games/playable`).pipe(catchError(this.handleError));
    }

    getBoard(id: string): Observable<BoardGameDTO> {
        return this.http.get<BoardGameDTO>(`${this.apiUrl}/board-games/${id}`).pipe(catchError(this.handleError));
    }

    createBoard(board: BoardGame): Observable<BoardGame> {
        return this.http.post<BoardGame>(`${this.apiUrl}/board-games/`, board).pipe(catchError(this.handleError));
    }
    duplicateBoard(board: BoardGame): Observable<BoardGame> {
        return this.http.post<BoardGame>(`${this.apiUrl}/board-games/duplicate`, board).pipe(catchError(this.handleError));
    }

    deleteBoard(id: string): Observable<boolean> {
        return this.http.delete<boolean>(`${this.apiUrl}/board-games/${id}`).pipe(catchError(this.handleError));
    }

    updateBoard(board: BoardGame): Observable<BoardGameDTO> {
        return this.http.put<BoardGameDTO>(`${this.apiUrl}/board-games/${board.id}`, board).pipe(catchError(this.handleError));
    }

    private handleError(error: HttpErrorResponse) {
        let errorMessage = 'Une erreur inconnue est survenue.';
        switch (error.status) {
            case HttpStatus.BadRequest:
                errorMessage = error.error?.error || ErrorMessages.BadRequestError;
                break;
            case HttpStatus.NotFound:
                errorMessage = ErrorMessages.NotFoundError;
                break;
            case HttpStatus.InternalServerError:
                errorMessage = ErrorMessages.InternalServerError;
                break;
        }
        console.error(errorMessage);

        return throwError(() => new Error(errorMessage));
    }
}

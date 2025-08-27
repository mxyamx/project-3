import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ErrorMessages, HttpStatus } from '@app/constants/http-status-constants';
import { BoardGame } from '@common/board-game';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class HttpBoardGameService {
    private readonly apiUrl = environment.serverUrl;
    constructor(private http: HttpClient) {}

    getAllBoards(): Observable<BoardGame[]> {
        return this.http.get<BoardGame[]>(`${this.apiUrl}/board-game/`).pipe(catchError(this.handleError));
    }

    getBoard(id: string): Observable<BoardGame> {
        return this.http.get<BoardGame>(`${this.apiUrl}/board-game/${id}`).pipe(catchError(this.handleError));
    }

    createBoard(board: BoardGame): Observable<BoardGame> {
        return this.http.post<BoardGame>(`${this.apiUrl}/board-game/`, board).pipe(catchError(this.handleError));
    }

    deleteBoard(id: string): Observable<boolean> {
        return this.http.delete<boolean>(`${this.apiUrl}/board-game/${id}`).pipe(catchError(this.handleError));
    }

    updateBoard(board: BoardGame): Observable<BoardGame> {
        return this.http.put<BoardGame>(`${this.apiUrl}/board-game/${board.id}`, board).pipe(catchError(this.handleError));
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

        return throwError(() => new Error(errorMessage));
    }
}

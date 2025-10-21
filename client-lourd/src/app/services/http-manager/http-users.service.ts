import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ErrorMessages, HttpStatus } from '@app/constants/http-status-constants';
import { User } from '@common/user';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class HttpUserService {
    private readonly apiUrl = environment.serverUrl;

    constructor(private http: HttpClient) {}

    getAllUsers(): Observable<User[]> {
        return this.http.get<User[]>(`${this.apiUrl}/users/`).pipe(catchError(this.handleError));
    }

    getUser(id: string): Observable<User> {
        return this.http.get<User>(`${this.apiUrl}/users/${id}`).pipe(catchError(this.handleError));
    }

    createUser(user: User): Observable<User> {
        return this.http.post<User>(`${this.apiUrl}/users/`, user).pipe(catchError(this.handleError));
    }

    updateUser(user: User): Observable<User> {
        return this.http.put<User>(`${this.apiUrl}/users/${user.id}`, user).pipe(catchError(this.handleError));
    }

    deleteUser(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/users/${id}`).pipe(catchError(this.handleError));
    }

    updateUserProfile(id: string, dto: { username?: string; email?: string; avatar?: string }) {
        return this.http.put<User>(`${this.apiUrl}/users/${encodeURIComponent(id)}`, dto);
    }

    private handleError(error: HttpErrorResponse) {
        console.error('HTTP Error Details:', error);
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

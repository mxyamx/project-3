import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ErrorMessages, HttpStatus } from '@app/constants/http-status-constants';
import { FriendRequest } from '@common/friend-request';
import { User } from '@common/user';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class FriendsService {
    private readonly apiUrl = `${environment.serverUrl}/friends`;

    constructor(private http: HttpClient) {}

    sendFriendRequest(receiverId: string): Observable<FriendRequest> {
        return this.http.post<FriendRequest>(`${this.apiUrl}/requests`, { receiverId }).pipe(catchError((e) => this.handleError(e)));
    }

    getPendingRequests(): Observable<(FriendRequest & { sender: { id: string; username: string; avatar: string } })[]> {
        return this.http
            .get<(FriendRequest & { sender: { id: string; username: string; avatar: string } })[]>(`${this.apiUrl}/requests/pending`)
            .pipe(catchError((e) => this.handleError(e)));
    }

    getSentRequests(): Observable<(FriendRequest & { receiver: { id: string; username: string; avatar: string } })[]> {
        return this.http
            .get<(FriendRequest & { receiver: { id: string; username: string; avatar: string } })[]>(`${this.apiUrl}/requests/sent`)
            .pipe(catchError((e) => this.handleError(e)));
    }

    acceptFriendRequest(requestId: string): Observable<{ sender: User; receiver: User }> {
        return this.http
            .put<{ sender: User; receiver: User }>(`${this.apiUrl}/requests/${requestId}/accept`, {})
            .pipe(catchError((e) => this.handleError(e)));
    }

    rejectFriendRequest(requestId: string): Observable<void> {
        return this.http.put<void>(`${this.apiUrl}/requests/${requestId}/reject`, {}).pipe(catchError((e) => this.handleError(e)));
    }

    cancelFriendRequest(requestId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/requests/${requestId}`).pipe(catchError((e) => this.handleError(e)));
    }

    removeFriend(friendId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${friendId}`).pipe(catchError((e) => this.handleError(e)));
    }

    getFriendsList(): Observable<User[]> {
        return this.http.get<User[]>(`${this.apiUrl}`).pipe(catchError((e) => this.handleError(e)));
    }

    searchUsers(query: string): Observable<User[]> {
        const params = new HttpParams().set('query', query ?? '');
        return this.http.get<User[]>(`${this.apiUrl}/search`, { params }).pipe(catchError((e) => this.handleError(e)));
    }

    blockUser(userId: string): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/block/${userId}`, {}).pipe(catchError((e) => this.handleError(e)));
    }

    unblockUser(userId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/block/${userId}`).pipe(catchError((e) => this.handleError(e)));
    }

    getBlockedUsers(): Observable<User[]> {
        return this.http.get<User[]>(`${this.apiUrl}/blocked`).pipe(catchError((e) => this.handleError(e)));
    }

    private handleError(error: HttpErrorResponse) {
        let errorMessage = 'Une erreur inconnue est survenue.';
        if (error.error?.error) {
            errorMessage = error.error.error;
        } else {
            switch (error.status) {
                case HttpStatus.BadRequest:
                    errorMessage = ErrorMessages.BadRequestError;
                    break;
                case HttpStatus.NotFound:
                    errorMessage = ErrorMessages.NotFoundError;
                    break;
                case HttpStatus.InternalServerError:
                    errorMessage = ErrorMessages.InternalServerError;
                    break;
            }
        }
        return throwError(() => new Error(errorMessage));
    }
}

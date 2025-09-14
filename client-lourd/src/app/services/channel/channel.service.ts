import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ErrorMessages, HttpStatus } from '@app/constants/http-status-constants';
import { Channel, ChannelSummary } from '@common/channel';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class ChannelService {
    private readonly apiUrl = environment.serverUrl;
    constructor(private http: HttpClient) {}
    getMyChannels(): Observable<ChannelSummary[]> {
        return this.http.get<ChannelSummary[]>(`${this.apiUrl}/channel/my`).pipe(catchError((e) => this.handleError(e)));
    }

    createChannel(channel: Channel): Observable<Channel> {
        return this.http.post<Channel>(`${this.apiUrl}/channel`, channel).pipe(catchError((e) => this.handleError(e)));
    }

    searchChannelsByPattern(pattern: string): Observable<Channel[]> {
        let params = new HttpParams().set('pattern', pattern ?? '');
        return this.http.get<Channel[]>(`${this.apiUrl}/channel/search`, { params }).pipe(catchError((e) => this.handleError(e)));
    }

    deleteChannel(channelId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/channel/${channelId}`).pipe(catchError((e) => this.handleError(e)));
    }

    joinChannel(channelId: string): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/channel/${channelId}/join`, {}).pipe(catchError((e) => this.handleError(e)));
    }

    leaveChannel(channelId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/channel/${channelId}/leave`).pipe(catchError((e) => this.handleError(e)));
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

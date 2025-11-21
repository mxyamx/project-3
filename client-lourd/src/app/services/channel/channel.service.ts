import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Channel, ChannelSummary } from '@common/channel';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class ChannelService {
    private readonly apiUrl = environment.serverUrl;
    constructor(private http: HttpClient) {}
    getMyChannels(): Observable<ChannelSummary[]> {
        return this.http.get<ChannelSummary[]>(`${this.apiUrl}/channels/my`);
    }

    createChannel(channel: Channel): Observable<ChannelSummary> {
        return this.http.post<ChannelSummary>(`${this.apiUrl}/channels`, channel);
    }

    searchChannelsByPattern(pattern: string): Observable<Channel[]> {
        let params = new HttpParams().set('pattern', pattern ?? '');
        return this.http.get<Channel[]>(`${this.apiUrl}/channels/search`, { params });
    }

    deleteChannel(channelId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/channels/${channelId}`);
    }

    joinChannel(channelId: string): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/channels/${channelId}/join`, {});
    }

    leaveChannel(channelId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/channels/${channelId}/leave`);
    }
}

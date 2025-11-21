import { Injectable, inject } from '@angular/core';
import { DeviceType } from '@common/enums/deviceType';
import { GameActivityStatus } from '@common/enums/game-activity-status';
import { UserStatusInfo } from '@common/user';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { SocketClientService } from '../client-socket/socket-client.service';

@Injectable({
    providedIn: 'root',
})
export class UserStatusService {
    private socketService = inject(SocketClientService);
    private userStatuses = new BehaviorSubject<Map<string, UserStatusInfo>>(new Map());
    private socketSubscriptions: Subscription[] = [];

    constructor() {
        this.listenToStatusChanges();
        this.setupReconnectionHandler();
    }

    private setupReconnectionHandler(): void {
        this.socketService.on('connect', () => {
            
        });
    }

    listenToStatusChanges(): void {
        this.socketSubscriptions.forEach((sub) => sub.unsubscribe());
        this.socketSubscriptions = [];

        const statusChangeSub = this.socketService.listen<UserStatusInfo>('user-game-activity-changed').subscribe((data) => {
            const statuses = this.userStatuses.value;
            statuses.set(data.userId, data);
            this.userStatuses.next(new Map(statuses));
        });

        const statusResponseSub = this.socketService.listen<{ statuses: UserStatusInfo[] }>('users-status-response').subscribe((data) => {
            const statuses = new Map(this.userStatuses.value);
            data.statuses.forEach((status) => {
                statuses.set(status.userId, status);
            });
            this.userStatuses.next(statuses);
        });

        this.socketSubscriptions.push(statusChangeSub, statusResponseSub);
    }

    fetchUserStatuses(userIds: string[]): void {
        if (userIds.length === 0) return;
        this.socketService.send('get-users-status', { userIds });
    }

    updateMyGameActivity(gameActivity: GameActivityStatus, gameId?: string): void {
        this.socketService.send('update-game-activity', { gameActivity, gameId });
    }

    getUserStatus(userId: string): UserStatusInfo | undefined {
        return this.userStatuses.value.get(userId);
    }

    getAllStatuses(): Observable<Map<string, UserStatusInfo>> {
        return this.userStatuses.asObservable();
    }

    isUserOnline(userId: string): boolean {
        const status = this.getUserStatus(userId);
        return status?.status !== DeviceType.offline;
    }

    canUserBeInvited(userId: string): boolean {
        const status = this.getUserStatus(userId);
        return status?.status !== DeviceType.offline && (!status?.gameActivity || status.gameActivity === GameActivityStatus.idle);
    }

    inviteToGame(friendId: string, gameId: string): void {
        this.socketService.send('invite-to-game', { friendId, gameId });
    }

    listenForInvitations(callback: (invitation: any) => void): void {
        this.socketService.on('game-invite-received', callback);
    }

    removeInvitationListener(): void {
        this.socketService.off('game-invite-received');
    }

    ngOnDestroy(): void {
        this.socketSubscriptions.forEach((sub) => sub.unsubscribe());
        this.socketSubscriptions = [];
    }
}

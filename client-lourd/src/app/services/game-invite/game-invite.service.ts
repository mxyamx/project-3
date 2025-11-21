import { inject, Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { CurrentGameManagerService } from '@app/services/current-game-manager/current-game-manager.service';
import { HttpUserService } from '@app/services/http-manager/http-users.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { UserManagerService } from '@app/services/user-manager/user-manager.service';
import { JoinGameAck } from '@common/current-game';
import { UrlPage } from '@common/enums/url-page';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';

export interface GameInvitation {
    from: string;
    fromId: string;
    fromAvatar: string;
    gameId: string;
    timestamp: number;
}

@Injectable({
    providedIn: 'root',
})
export class GameInviteService implements OnDestroy {
    private socketService = inject(SocketClientService);
    private playerSocketService = inject(PlayerSocketService);
    private router = inject(Router);
    private currentGameManager = inject(CurrentGameManagerService);
    private httpUserService = inject(HttpUserService);
    private userManagerService = inject(UserManagerService);

    private pendingInvitations = new BehaviorSubject<GameInvitation[]>([]);
    private processingInvitation = new BehaviorSubject<boolean>(false);
    private invitationError = new BehaviorSubject<string | null>(null);
    private hasNewInvitations = new BehaviorSubject<boolean>(false);

    private socketSubscriptions: Subscription[] = [];

    constructor() {
        this.setupInvitationListener();
        this.setupReconnectionHandler();
    }

    ngOnDestroy(): void {
        this.socketSubscriptions.forEach((sub) => sub.unsubscribe());
        this.socketSubscriptions = [];
    }

    private setupReconnectionHandler(): void {
        this.socketService.on('connect', () => {
            
            this.setupInvitationListener();
        });
    }

    setupInvitationListener(): void {

        this.socketSubscriptions.forEach((sub) => sub.unsubscribe());
        this.socketSubscriptions = [];

        const inviteReceivedSub = this.socketService.listen<GameInvitation>('game-invite-received').subscribe((data) => {
            

            const currentUserId = this.userManagerService.getCurrentUser().id;
            if (data.fromId === currentUserId) {
                return;
            }

            const invitation: GameInvitation = {
                ...data,
                timestamp: Date.now(),
            };

            const current = this.pendingInvitations.value;

            if (!current.find((inv) => inv.gameId === invitation.gameId && inv.fromId === invitation.fromId)) {
                this.pendingInvitations.next([invitation, ...current]);
                this.hasNewInvitations.next(true);
            }
        });

        const inviteSentSub = this.socketService.listen<{ success: boolean }>('invite-sent').subscribe((data) => {
            if (data.success) {
                console.log('Invitation sent successfully');
            }
        });

        const inviteFailedSub = this.socketService.listen<{ reason: string }>('invite-failed').subscribe((data) => {
            console.log('Invitation failed:', data.reason);
        });

        this.socketSubscriptions.push(inviteReceivedSub, inviteSentSub, inviteFailedSub);
    }

    getPendingInvitations(): Observable<GameInvitation[]> {
        return this.pendingInvitations.asObservable();
    }

    getInvitationCount(): number {
        return this.pendingInvitations.value.length;
    }

    hasNew(): Observable<boolean> {
        return this.hasNewInvitations.asObservable();
    }

    markAsRead(): void {
        this.hasNewInvitations.next(false);
    }

    getProcessingState(): Observable<boolean> {
        return this.processingInvitation.asObservable();
    }

    getInvitationError(): Observable<string | null> {
        return this.invitationError.asObservable();
    }

    acceptInvitation(invitation: GameInvitation): void {
        this.processingInvitation.next(true);
        this.invitationError.next(null);

        this.socketService.send('accept-game-invite', {
            gameId: invitation.gameId,
            inviterId: invitation.fromId,
        });

        this.playerSocketService.emitJoinAvatarRoom(invitation.gameId, (response: JoinGameAck) => {
            this.processingInvitation.next(false);

            if (response.notFriendError) {
                this.invitationError.next('game-invite.errors.not-friend');
                return;
            }

            if (response.blockedByPlayerError) {
                this.invitationError.next('game-invite.errors.blocked-by-player');
                return;
            }

            if (response.youBlockedPlayerWarning) {
                this.invitationError.next('game-invite.errors.you-blocked-player');
                return;
            }

            if (response.codeError) {
                this.invitationError.next('game-invite.errors.game-not-found');
                return;
            }

            if (response.lockedError) {
                this.invitationError.next('game-invite.errors.game-locked');
                return;
            }

            if (response.limitError) {
                this.invitationError.next('game-invite.errors.game-full');
                return;
            }

            if (response.insufficientFundsError) {
                this.invitationError.next('game-invite.errors.insufficient-funds');
                return;
            }

            if (!response.game) {
                this.invitationError.next('game-invite.errors.unknown');
                return;
            }

            this.removeInvitation(invitation);
            this.refreshUserData();
            this.currentGameManager.updateCurrentGame(response.game);
            this.router.navigate([UrlPage.Avatar]);
        });
    }

    declineInvitation(invitation: GameInvitation): void {
        this.socketService.send('decline-game-invite', {
            gameId: invitation.gameId,
            inviterId: invitation.fromId,
        });

        this.removeInvitation(invitation);
    }

    removeInvitation(invitation: GameInvitation): void {
        const current = this.pendingInvitations.value;
        this.pendingInvitations.next(current.filter((inv) => !(inv.gameId === invitation.gameId && inv.fromId === invitation.fromId)));
    }

    clearError(): void {
        this.invitationError.next(null);
    }

    clearAllInvitations(): void {
        this.pendingInvitations.next([]);
        this.hasNewInvitations.next(false);
    }

    private refreshUserData(): void {
        const userId = this.userManagerService.getCurrentUser().id;
        this.httpUserService.getUser(userId).subscribe({
            next: (user) => {
                this.userManagerService.setMoney(user.money);
            },
            error: (err) => console.error('Failed to refresh user data:', err),
        });
    }

    getInvitationCountObservable(): Observable<number> {
        return new Observable((observer) => {
            const subscription = this.pendingInvitations.subscribe((invites) => {
                observer.next(invites.length);
            });
            return () => subscription.unsubscribe();
        });
    }
}

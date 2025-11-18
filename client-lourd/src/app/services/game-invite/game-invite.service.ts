import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { CurrentGameManagerService } from '@app/services/current-game-manager/current-game-manager.service';
import { HttpUserService } from '@app/services/http-manager/http-users.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { UserManagerService } from '@app/services/user-manager/user-manager.service';
import { JoinGameAck } from '@common/current-game';
import { UrlPage } from '@common/enums/url-page';
import { BehaviorSubject, Observable } from 'rxjs';

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
export class GameInviteService {
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

    constructor() {
        this.setupInvitationListener();
    }

    private setupInvitationListener(): void {
        this.socketService.on('game-invite-received', (data: GameInvitation) => {
            console.log('🎮 Game invitation received:', data);

            const invitation: GameInvitation = {
                ...data,
                timestamp: Date.now(),
            };

            const current = this.pendingInvitations.value;

            // Check if invitation already exists (avoid duplicates)
            if (!current.find((inv) => inv.gameId === invitation.gameId && inv.fromId === invitation.fromId)) {
                this.pendingInvitations.next([invitation, ...current]);
                this.hasNewInvitations.next(true);
            }
        });

        this.socketService.on('invite-sent', (data: { success: boolean }) => {
            if (data.success) {
                console.log('✅ Invitation sent successfully');
            }
        });

        this.socketService.on('invite-failed', (data: { reason: string }) => {
            console.log('❌ Invitation failed:', data.reason);
        });
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
        console.log('✅ Accepting invitation to game:', invitation.gameId);

        this.processingInvitation.next(true);
        this.invitationError.next(null);

        // Send acceptance to server
        this.socketService.send('accept-game-invite', {
            gameId: invitation.gameId,
            inviterId: invitation.fromId,
        });

        // Use the same join game logic
        this.playerSocketService.emitJoinAvatarRoom(invitation.gameId, (response: JoinGameAck) => {
            this.processingInvitation.next(false);

            // Handle all possible error cases
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

            // Success! Remove invitation and join the game
            this.removeInvitation(invitation);
            this.refreshUserData();
            this.currentGameManager.updateCurrentGame(response.game);
            this.router.navigate([UrlPage.Avatar]);
        });
    }

    declineInvitation(invitation: GameInvitation): void {
        console.log('❌ Declining invitation from:', invitation.from);

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
}

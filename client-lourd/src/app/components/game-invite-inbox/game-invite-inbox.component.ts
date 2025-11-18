import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { GameInvitation, GameInviteService } from '@app/services/game-invite/game-invite.service';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-game-invite-inbox',
    standalone: true,
    imports: [CommonModule, TranslatePipe],
    templateUrl: './game-invite-inbox.component.html',
    styleUrl: './game-invite-inbox.component.scss',
})
export class GameInviteInboxComponent implements OnInit, OnDestroy {
    @Output() close = new EventEmitter<void>();

    private gameInviteService = inject(GameInviteService);

    invitations: GameInvitation[] = [];
    isProcessing: boolean = false;
    errorMessage: string | null = null;

    private invitationsSubscription?: Subscription;
    private processingSubscription?: Subscription;
    private errorSubscription?: Subscription;

    ngOnInit(): void {
        this.invitationsSubscription = this.gameInviteService.getPendingInvitations().subscribe((invitations) => {
            this.invitations = invitations;
        });

        this.processingSubscription = this.gameInviteService.getProcessingState().subscribe((processing) => {
            this.isProcessing = processing;
        });

        this.errorSubscription = this.gameInviteService.getInvitationError().subscribe((error) => {
            this.errorMessage = error;
        });

        // Mark invitations as read when popup opens
        this.gameInviteService.markAsRead();
    }

    ngOnDestroy(): void {
        this.invitationsSubscription?.unsubscribe();
        this.processingSubscription?.unsubscribe();
        this.errorSubscription?.unsubscribe();
    }

    acceptInvitation(invitation: GameInvitation): void {
        this.gameInviteService.acceptInvitation(invitation);
    }

    declineInvitation(invitation: GameInvitation): void {
        this.gameInviteService.declineInvitation(invitation);
    }

    closeError(): void {
        this.gameInviteService.clearError();
    }

    onClose(): void {
        this.close.emit();
    }

    getTimeAgo(timestamp: number): string {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }
}

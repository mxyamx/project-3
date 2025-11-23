import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ChatContainerComponent } from '@app/components/chat-container/chat-container.component';
import { ToastFightComponent } from '@app/components/toast-fight/toast-fight.component';
import { ChatService } from '@app/services/chat/chat.service';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { CurrentGameManagerService } from '@app/services/current-game-manager/current-game-manager.service';
import { HttpUserService } from '@app/services/http-manager/http-users.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { UserManagerService } from '@app/services/user-manager/user-manager.service';
import { CurrentGame, CurrentGamePhase, CurrentGamePreview, JoinGameAck } from '@common/current-game';
import { GameMode } from '@common/enums/game-mode';
import { SocketEventNames } from '@common/enums/socket-events-names';
import { UrlPage } from '@common/enums/url-page';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-entering-current-game-page',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, TranslatePipe, ToastFightComponent, ChatContainerComponent],
    templateUrl: './entering-current-game-page.html',
    styleUrls: ['./entering-current-game-page.scss'],
})
export class EnteringCurrentGamePageComponent implements OnInit, OnDestroy {
    currentGame: CurrentGame;
    showEnterCodeTab: WritableSignal<boolean> = signal(true);
    previews: WritableSignal<CurrentGamePreview[]> = signal([]);
    currentGamePhase: typeof CurrentGamePhase = CurrentGamePhase;
    codeArray: string[] = ['', '', '', ''];
    codeError: boolean = false;
    lockedError: boolean = false;
    limitError: boolean = false;
    moneyError = false;
    hasBeenClicked: boolean = false;
    notFriendError = false;
    blockedByPlayerError = false;
    showBlockedUserWarning = false;
    pendingGameId: string | null = null;
    showChat: WritableSignal<boolean> = signal(false);
    chatService: ChatService = inject(ChatService);

    private httpUserService = inject(HttpUserService);
    private playerSocketService: PlayerSocketService = inject(PlayerSocketService);
    private clientSocketService: SocketClientService = inject(SocketClientService);
    private userManagerService = inject(UserManagerService);
    private currentGameManager = inject(CurrentGameManagerService);
    protected readonly gameMode = GameMode;
    constructor(private router: Router) {}

    ngOnInit(): void {
        this.playerSocketService.emitGetCurrentGamePreviews((previews: CurrentGamePreview[]) => {
            this.previews.set(previews);
        });
        this.playerSocketService.onCurrentGamePreviewsUpdated((previews: CurrentGamePreview[]) => this.previews.set(previews));
    }

    ngOnDestroy(): void {
        this.clientSocketService.off(SocketEventNames.CurrentGamePreviewsUpdated);
    }

    get playerMoney(): number {
        return this.userManagerService.currentUser().money;
    }

    moveToNext(nextInput: HTMLInputElement, index: number): void {
        if (this.codeArray[index] && nextInput) {
            nextInput.focus();
        }
    }

    moveToPrev(prevInput: HTMLInputElement, index: number): void {
        if (!this.codeArray[index] && prevInput) {
            prevInput.focus();
        }
    }

    isCodeComplete(): boolean {
        return this.codeArray.every((value) => value.length === 1);
    }

    closeModal() {
        this.codeError = false;
        this.notFriendError = false;
        this.blockedByPlayerError = false;
        this.lockedError = false;
        this.limitError = false;
        this.moneyError = false;
    }

    joinGame(id: string) {
        this.playerSocketService.emitJoinAvatarRoom(id, (response: JoinGameAck) => {
            const preview = this.previews().find((p) => p.id === id);

            if (preview && preview.entryPrice > this.playerMoney) {
                this.moneyError = true;
                return;
            }

            if (response.notFriendError) {
                this.notFriendError = true;
                return;
            }

            if (response.blockedByPlayerError) {
                this.blockedByPlayerError = true;
                return;
            }

            if (response.youBlockedPlayerWarning) {
                this.showBlockedUserWarning = true;
                this.pendingGameId = id;
                this.currentGameManager.updateCurrentGame(response.game!);
                return;
            }

            if (response.codeError) {
                this.codeError = response.codeError;
                return;
            }
            if (response.lockedError) {
                this.lockedError = response.lockedError;
                return;
            }
            if (response.limitError) {
                this.limitError = response.limitError;
                return;
            }
            if (response.insufficientFundsError) {
                this.moneyError = true;
                return;
            }

            if (!response.game) {
                this.codeError = true;
                return;
            }

            this.refreshUserData();

            this.currentGameManager.updateCurrentGame(response.game);
            this.hasBeenClicked = true;
            this.router.navigate([UrlPage.Avatar]);
        });
    }

    findGame(preview: CurrentGamePreview) {
        if (!preview.isJoinable) {
            return;
        }
        if (preview.entryPrice > this.playerMoney) {
            this.moneyError = true;
            return;
        }
    }

    enterCode() {
        const code = this.codeArray.join('');
        this.joinGame(code);
    }

    error(): boolean {
        return this.lockedError || this.limitError || this.codeError || this.moneyError || this.notFriendError || this.blockedByPlayerError;
    }

    retry() {
        this.codeError = false;
        this.lockedError = false;
        this.limitError = false;
        this.moneyError = false;
    }

    proceedWithBlockedUser() {
        this.showBlockedUserWarning = false;
        this.hasBeenClicked = true;
        this.router.navigate([UrlPage.Avatar]);
    }

    cancelJoinBlockedUser() {
        this.showBlockedUserWarning = false;
        this.pendingGameId = null;
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
    openChat() {
        this.showChat.set(!this.showChat());
    }
}

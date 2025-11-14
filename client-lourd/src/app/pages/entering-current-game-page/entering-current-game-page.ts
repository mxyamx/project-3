import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastFightComponent } from '@app/components/toast-fight/toast-fight.component';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { CurrentGameManagerService } from '@app/services/current-game-manager/current-game-manager.service';
import { HttpUserService } from '@app/services/http-manager/http-users.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { UserManagerService } from '@app/services/user-manager/user-manager.service';
import { CurrentGame, CurrentGamePhase, CurrentGamePreview } from '@common/current-game';
import { PlayerLimits } from '@common/enums/players-limit';
import { SocketEventNames } from '@common/enums/socket-events-names';
import { UrlPage } from '@common/enums/url-page';
import { User } from '@common/user';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-entering-current-game-page',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, TranslatePipe, ToastFightComponent],
    templateUrl: './entering-current-game-page.html',
    styleUrls: ['./entering-current-game-page.scss'],
})
export class EnteringCurrentGamePageComponent implements OnInit, OnDestroy {
    @Input() gameId: string = '';
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
    playerMoney: number;
    private httpUserService = inject(HttpUserService);
    private playerSocketService: PlayerSocketService = inject(PlayerSocketService);
    private clientSocketService: SocketClientService = inject(SocketClientService);
    private userManagerService = inject(UserManagerService);
    private currentGameManager = inject(CurrentGameManagerService);

    constructor(private router: Router) {
        this.playerMoney = this.userManagerService.getCurrentUser().money;
    }

    ngOnInit(): void {
        this.playerSocketService.emitGetCurrentGamePreviews((previews: CurrentGamePreview[]) => {
            this.previews.set(previews);
        });
        this.playerSocketService.onCurrentGamePreviewsUpdated((previews: CurrentGamePreview[]) => this.previews.set(previews));
    }
    ngOnDestroy(): void {
        this.clientSocketService.off(SocketEventNames.CurrentGamePreviewsUpdated);
    }

    canJoinGame(canEnter: boolean): void {
        if (canEnter) {
            this.router.navigate([UrlPage.Avatar]);
            this.playerSocketService.emitJoinAvatarRoom(this.gameId);
        }
    }

    moveToNext(nextInput: HTMLInputElement, index: number): void {
        if (this.codeArray[index] && nextInput) {
            nextInput.focus();
        }
        this.updateCode();
    }

    moveToPrev(prevInput: HTMLInputElement, index: number): void {
        if (!this.codeArray[index] && prevInput) {
            prevInput.focus();
        }
        this.updateCode();
    }

    updateCode(): void {
        this.gameId = this.codeArray.join('');
    }

    isCodeComplete(): boolean {
        return this.codeArray.every((value) => value.length === 1);
    }

    validateJoin(code: string): void {
        this.playerSocketService.emitGetGame(code, (response: CurrentGame) => {
            if (response) {
                // refresh from user manager to avoid stale value
                const user = this.userManagerService.getCurrentUser();
                const currentMoney = user.money;

                if (response.entryPrice > currentMoney) {
                    this.moneyError = true;
                }

                if (response.locked) {
                    this.lockedError = true;
                }

                const maxPlayers = PlayerLimits[response.boardGame.size].maxPlayers;
                if (response.players.length >= maxPlayers) {
                    this.limitError = true;
                }

                if (!this.error()) {
                    this.chargeEntryFee(response.entryPrice);
                    this.currentGameManager.updateCurrentGame(response);
                    this.canJoinGame(true);
                    this.hasBeenClicked = true;
                }
            } else {
                this.codeError = true;
            }
        });
    }

    joinGame(preview: CurrentGamePreview) {
        if (!preview.isJoinable) {
            return;
        }
        if (preview.entryPrice > this.playerMoney) {
            this.moneyError = true;
            return;
        }
        this.validateJoin(preview.id);
    }

    enterCode() {
        const code = this.codeArray.join('');
        this.validateJoin(code);
    }

    error(): boolean {
        return this.lockedError || this.limitError || this.codeError || this.moneyError;
    }

    retry() {
        this.codeError = false;
        this.lockedError = false;
        this.limitError = false;
        this.moneyError = false;
    }

    private chargeEntryFee(entryPrice: number): void {
        if (entryPrice <= 0) return;

        const user = this.userManagerService.getCurrentUser();
        const newMoney = Math.max(0, user.money - entryPrice);
        const updatedUser: User = { ...user, money: newMoney };

        this.httpUserService.updateUser(updatedUser).subscribe({
            next: () => {
                // update local state
                this.userManagerService.setMoney(newMoney);
                this.playerMoney = newMoney;
            },
            error: () => {
                // optional: show a toast or log; for now ignore
                // (you could also revert moneyError or show a modal)
            },
        });
    }
}

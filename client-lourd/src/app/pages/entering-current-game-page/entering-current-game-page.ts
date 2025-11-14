import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastFightComponent } from '@app/components/toast-fight/toast-fight.component';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { CurrentGameManagerService } from '@app/services/current-game-manager/current-game-manager.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { UserManagerService } from '@app/services/user-manager/user-manager.service';
import { CurrentGame, CurrentGamePhase, CurrentGamePreview, JoinGameAck } from '@common/current-game';
import { SocketEventNames } from '@common/enums/socket-events-names';
import { UrlPage } from '@common/enums/url-page';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-entering-current-game-page',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, TranslatePipe, ToastFightComponent],
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
    playerMoney: number;
    // private httpUserService = inject(HttpUserService);
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

    joinGame(id: string) {
        this.playerSocketService.emitJoinAvatarRoom(id, (response: JoinGameAck) => {
            const preview = this.previews().find((p) => p.id === id);
            if (preview && preview.entryPrice > this.playerMoney) {
                this.moneyError = true;
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

            if (!response.game) {
                this.codeError = true;
                return;
            }
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
        // this.validateJoin(preview.id);
    }

    enterCode() {
        const code = this.codeArray.join('');
        this.joinGame(code);
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

    // private chargeEntryFee(entryPrice: number): void {
    //     if (entryPrice <= 0) return;

    //     const user = this.userManagerService.getCurrentUser();
    //     const newMoney = Math.max(0, user.money - entryPrice);
    //     const updatedUser: User = { ...user, money: newMoney };

    //     this.httpUserService.updateUser(updatedUser).subscribe({
    //         next: () => {
    //             // update local state
    //             this.userManagerService.setMoney(newMoney);
    //             this.playerMoney = newMoney;
    //         },
    //         error: () => {
    //             // optional: show a toast or log; for now ignore
    //             // (you could also revert moneyError or show a modal)
    //         },
    //     });
    // }
}

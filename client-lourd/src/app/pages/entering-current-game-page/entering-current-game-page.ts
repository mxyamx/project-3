import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastFightComponent } from '@app/components/toast-fight/toast-fight.component';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { CurrentGameManagerService } from '@app/services/current-game-manager/current-game-manager.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
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
    hasBeenClicked: boolean = false;
    private playerSocketService: PlayerSocketService = inject(PlayerSocketService);
    private clientSocketService: SocketClientService = inject(SocketClientService);
    private currentGameManager = inject(CurrentGameManagerService);

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

        this.joinGame(preview.id);
    }
    enterCode() {
        const code = this.codeArray.join('');
        this.joinGame(code);
    }

    error(): boolean {
        return this.lockedError || this.limitError || this.codeError;
    }

    retry() {
        this.codeError = false;
        this.lockedError = false;
        this.limitError = false;
    }
}

import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastFightComponent } from '@app/components/toast-fight/toast-fight.component';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { CurrentGameManagerService } from '@app/services/current-game-manager/current-game-manager.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { CurrentGame, CurrentGamePhase, CurrentGamePreview } from '@common/current-game';
import { PlayerLimits } from '@common/enums/players-limit';
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
    @Input() gameId: string = '';
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
                if (response.locked) {
                    this.lockedError = true;
                }
                const maxPlayers = PlayerLimits[response.boardGame.size].maxPlayers;
                if (response.players.length >= maxPlayers) {
                    this.limitError = true;
                }
                if (!this.error()) {
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
        this.validateJoin(preview.id);
    }
    enterCode() {
        const code = this.codeArray.join('');
        this.validateJoin(code);
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

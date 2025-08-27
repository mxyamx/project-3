import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CurrentGameManagerService } from '@app/services/current-game-manager/current-game-manager.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { CurrentGame } from '@common/current-game';
import { PlayerLimits } from '@common/enums/players-limit';

@Component({
    selector: 'app-code-input-component',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './code-input-component.html',
    styleUrls: ['./code-input-component.scss'],
})
export class CodeInputComponent implements OnInit {
    @Output() canEnterGame: EventEmitter<boolean> = new EventEmitter();
    @Output() accessCode: EventEmitter<string> = new EventEmitter<string>();
    codeArray: string[] = ['', '', '', ''];
    codeError: boolean = false;
    lockedError: boolean = false;
    limitError: boolean = false;
    hasBeenClicked: boolean = false;
    private playerSocketService = inject(PlayerSocketService);
    private currentGameManager = inject(CurrentGameManagerService);

    ngOnInit() {
        this.playerSocketService.connect();
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
        this.accessCode.emit(this.codeArray.join(''));
    }

    isCodeComplete(): boolean {
        return this.codeArray.every((value) => value.length === 1);
    }

    validateCode(): void {
        const code = this.codeArray.join('');
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
                    this.canEnterGame.emit(true);
                    this.hasBeenClicked = true;
                }
            } else {
                this.codeError = true;
            }
        });
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

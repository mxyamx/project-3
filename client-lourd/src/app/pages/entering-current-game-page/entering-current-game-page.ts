import { CommonModule } from '@angular/common';
import { Component, inject, Input, signal, WritableSignal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CodeInputComponent } from '@app/components/code-input-component/code-input-component';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { CurrentGame } from '@common/current-game';
import { UrlPage } from '@common/enums/url-page';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-entering-current-game-page',
    standalone: true,
    imports: [CommonModule, CodeInputComponent, RouterLink, TranslatePipe],
    templateUrl: './entering-current-game-page.html',
    styleUrls: ['./entering-current-game-page.scss'],
})
export class EnteringCurrentGamePageComponent {
    @Input() gameId: string = '';
    currentGame: CurrentGame;
    showEnterCodeTab: WritableSignal<boolean> = signal(true);
    private playerSocketService: PlayerSocketService = inject(PlayerSocketService);

    constructor(private router: Router) {}

    canJoinGame(canEnter: boolean): void {
        if (canEnter) {
            this.router.navigate([UrlPage.Avatar]);
            this.playerSocketService.emitJoinAvatarRoom(this.gameId);
        }
    }
}

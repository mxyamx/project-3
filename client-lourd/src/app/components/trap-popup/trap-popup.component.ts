import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { SocketServerEventNames } from '@common/enums/socket-events-names';
import * as dataForm from '@common/socket-data-forms';

@Component({
    selector: 'app-trap-popup',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './trap-popup.component.html',
    styleUrl: './trap-popup.component.scss',
})
export class TrapPopupComponent {
    showTrapPopup = false;
    playerMovementPoints = 0;
    canAvoidTrap = false;

    private socketService = inject(SocketClientService);
    private gameSessionManager = inject(GameSessionManagerService);
    private readonly AVOID_TRAP_COST = 3;

    showPopup(movementPoints: number): void {
        this.playerMovementPoints = movementPoints;
        this.canAvoidTrap = movementPoints >= this.AVOID_TRAP_COST;
        this.showTrapPopup = true;
    }
    chooseTrapOption(avoid: boolean): void {
        this.showTrapPopup = false;

        const choice: dataForm.HandleTrapChoice = {
            gameCode: this.gameSessionManager.gameId(), // Add this
            avoid,
        };

        this.socketService.send(SocketServerEventNames.HandleTrap, choice);
    }

    hidePopup(): void {
        this.showTrapPopup = false;
    }
}

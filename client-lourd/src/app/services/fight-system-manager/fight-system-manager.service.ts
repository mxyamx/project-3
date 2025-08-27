import { Injectable, inject } from '@angular/core';
import { ActionDetectorService } from '@app/services/action-detector/action-detector.service';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { SocketServerEventNames } from '@common/enums/socket-events-names';
import { Position } from '@common/position';
import * as dataForm from '@common/socket-data-forms';

@Injectable({
    providedIn: 'root',
})
export class FightSystemManagerService {
    private actionDetector: ActionDetectorService = inject(ActionDetectorService);
    private socketManager: SocketClientService = inject(SocketClientService);

    startAttack(targetPosition: Position, gameId: string): void {
        this.actionDetector.deactivateAction();
        const data: dataForm.StartFightReq = {
            gameCode: gameId,
            targetPlayerPosition: targetPosition,
        };

        this.socketManager.send(SocketServerEventNames.StartFight, data);
    }

    attackPlayer(gameId: string): void {
        const data: dataForm.ExecuteAttackReq = {
            gameCode: gameId,
        };

        this.socketManager.send(SocketServerEventNames.ExecuteAttack, data);
    }

    attemptEscape(gameId: string): void {
        const data: dataForm.EscapeAttemptReq = {
            gameCode: gameId,
        };

        this.socketManager.send(SocketServerEventNames.AttemptEscape, data);
    }
}

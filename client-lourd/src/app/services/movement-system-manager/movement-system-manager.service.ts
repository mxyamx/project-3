import { Injectable, inject } from '@angular/core';
import { ActionDetectorService } from '@app/services/action-detector/action-detector.service';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { SocketServerEventNames } from '@common/enums/socket-events-names';
import { Position } from '@common/position';
import * as dataForm from '@common/socket-data-forms';

@Injectable({
    providedIn: 'root',
})
export class MovementSystemManagerService {
    private actionDetector: ActionDetectorService = inject(ActionDetectorService);
    private socketManager: SocketClientService = inject(SocketClientService);

    toggleDoorState(doorPosition: Position, gameId: string): void {
        this.actionDetector.deactivateAction();
        const data: dataForm.ToggleDoorStateReq = {
            gameCode: gameId,
            doorPosition,
        };

        this.socketManager.send(SocketServerEventNames.ToggleDoorState, data);
    }
    movePlayer(positions: Position[], gameId: string): void {
        const data: dataForm.MoveReq = {
            gameCode: gameId,
            path: positions,
        };

        this.socketManager.send(SocketServerEventNames.Move, data);
    }
    teleportPlayer(oldPosition: Position, newPosition: Position, gameId: string): void {
        const data: dataForm.TeleportPlayerReq = {
            gameCode: gameId,
            newPosition,
            oldPosition,
        };

        this.socketManager.send(SocketServerEventNames.Teleport, data);
    }
    useTeleporter(position: Position, gameId: string): void {
        this.actionDetector.deactivateAction();
        const data: dataForm.UseTeleporterReq = {
            gameCode: gameId,
            position,
        };

        this.socketManager.send(SocketServerEventNames.UseTeleporter, data);
    }
}

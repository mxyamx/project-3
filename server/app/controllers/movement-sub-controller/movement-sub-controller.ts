import { GameSession } from '@app/classes/game-session/game-session';
import { STANDARD_ERROR_MESSAGE } from '@app/constants/development-constants';
import { genErrorMessage, sendError } from '@app/utils/functions/socket-error-functions';
import { SocketClientEventNames } from '@common/enums/socket-events-names';
import { Position } from '@common/position';
import * as dataForm from '@common/socket-data-forms';
import * as io from 'socket.io';

export class MovementSubController {
    constructor(
        private gameSession: GameSession,
        private roomCode: string,
        private sio: io.Server,
    ) {}
    movePlayer(oldPosition: Position, newPosition: Position, isMovingToItem?: boolean): void {
        try {
            this.gameSession.movePlayer(oldPosition, newPosition);
            const ans: dataForm.MovePlayer = {
                successful: true,
                message: '',
                boardGame: this.gameSession.board,
                listOfPlayers: this.gameSession.listOfPlayers.getValues(),
                activePlayer: this.gameSession.activePlayerInstance,
                isMovingToItem,
            };

            this.sio.to(this.roomCode).emit(SocketClientEventNames.MovePlayer, ans);
        } catch {
            const ans: dataForm.StandardRes = genErrorMessage();
            this.sio.to(this.roomCode).emit(SocketClientEventNames.MovePlayer, ans);
            sendError(STANDARD_ERROR_MESSAGE, this.sio, this.roomCode);
        }
    }

    endMovement(): void {
        const ans: dataForm.StandardRes = {
            successful: true,
            message: '',
        };
        this.sio.to(this.roomCode).emit(SocketClientEventNames.MovementOver, ans);
    }

    toggleDoorState(doorPosition: Position): void {
        try {
            const doorState = this.gameSession.toggleDoorState(doorPosition);

            const ans: dataForm.ToggleDoorStateRes = {
                successful: true,
                message: 'executed',
                boardGame: this.gameSession.board,
                listOfPlayers: this.gameSession.listOfPlayers.getValues(),
                activePlayer: this.gameSession.activePlayerInstance,
                doorPosition,
                doorState,
            };
            this.sio.to(this.roomCode).emit(SocketClientEventNames.ToggleDoorState, ans);
        } catch {
            const ans: dataForm.StandardRes = genErrorMessage();
            this.sio.to(this.roomCode).emit(SocketClientEventNames.ToggleDoorState, ans);
            sendError(STANDARD_ERROR_MESSAGE, this.sio, this.roomCode);
        }
    }

    teleportPlayer(oldPosition: Position, newPosition: Position): void {
        this.gameSession.teleport(oldPosition, newPosition);
        this.gameSession.statisticsManager.updateTilePercentage(newPosition);
        this.gameSession.statisticsManager.updatePlayerTilePercentage(this.gameSession.activePlayerInstance.userId, newPosition);

        const ans: dataForm.TeleportPlayerRes = {
            successful: true,
            message: 'executed',
            boardGame: this.gameSession.board,
            listOfPlayers: this.gameSession.listOfPlayers.getValues(),
            activePlayer: this.gameSession.activePlayerInstance,
        };
        this.sio.to(this.roomCode).emit(SocketClientEventNames.Teleport, ans);
    }
}

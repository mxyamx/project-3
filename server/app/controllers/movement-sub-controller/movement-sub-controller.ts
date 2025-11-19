import { GameSession } from '@app/classes/game-session/game-session';
import { STANDARD_ERROR_MESSAGE } from '@app/constants/development-constants';
import { genErrorMessage, sendError } from '@app/utils/functions/socket-error-functions';
import { SocketClientEventNames } from '@common/enums/socket-events-names';
import { TileType } from '@common/enums/tile-type';
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
            const hasTrap = this.checkForTrap(newPosition);

            const ans: dataForm.MovePlayer = {
                successful: true,
                message: '',
                boardGame: this.gameSession.board,
                listOfPlayers: this.gameSession.listOfPlayers.getValues(),
                activePlayer: this.gameSession.activePlayerInstance,
                isMovingToItem,
                hasTrap, // Add this field to MovePlayer interface
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
    checkForTrap(position: Position): boolean {
        const tile = this.gameSession.board.tiles[position.x][position.y];

        if (tile.type === TileType.Trap) {
            const activePlayer = this.gameSession.activePlayerInstance;
            const movementPoints = activePlayer.attributes.speedValue;

            const ans: dataForm.TrapEncounteredData = {
                successful: true,
                message: 'Player landed on trap',
                trapPosition: position,
                playerMovementPoints: movementPoints,
            };

            this.sio.to(activePlayer.socketId).emit(SocketClientEventNames.TrapEncountered, ans);
            return true; // Indicate trap was found
        }
        return false;
    }
    // movement-sub-controller.ts - Updated handleTrapChoice method

    handleTrapChoice(choice: dataForm.HandleTrapChoice): void {
        try {
            const activePlayer = this.gameSession.activePlayerInstance;
            let trapActivated = false;
            let turnEnded = false;
            const avoided = choice.avoid; // Track if player avoided the trap

            if (choice.avoid) {
                // Avoid trap - costs 3 movement points
                activePlayer.attributes.speedValue = Math.max(0, activePlayer.attributes.speedValue - 3);
            } else {
                // Attempt to cross - costs 1 movement point
                activePlayer.attributes.speedValue = Math.max(0, activePlayer.attributes.speedValue - 1);

                // 50% chance trap activates
                // eslint-disable-next-line @typescript-eslint/no-magic-numbers
                trapActivated = Math.random() < 0.5;

                if (trapActivated) {
                    // Trap activates - end turn
                    activePlayer.attributes.speedValue = 0;
                    turnEnded = true;
                }
            }

            const ans: dataForm.TrapResolvedData = {
                successful: true,
                message: 'Trap resolved',
                trapActivated,
                turnEnded,
                avoided, // FIX #2: Add this field to show what player chose
                boardGame: this.gameSession.board,
                listOfPlayers: this.gameSession.listOfPlayers.getValues(),
                activePlayer: this.gameSession.activePlayerInstance,
            };

            this.sio.to(this.roomCode).emit(SocketClientEventNames.TrapResolved, ans);
        } catch {
            const ans: dataForm.StandardRes = genErrorMessage();
            this.sio.to(this.roomCode).emit(SocketClientEventNames.TrapResolved, ans);
            sendError(STANDARD_ERROR_MESSAGE, this.sio, this.roomCode);
        }
    }
}

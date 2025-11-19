import { GameClockManager } from '@app/classes/game-clock-manager/game-clock-manager';
import { GameSession } from '@app/classes/game-session/game-session';
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { FightSubController } from '@app/controllers/fight-sub-controller/fight-sub-controller';
import { GameSessionController } from '@app/controllers/game-session-controller/game-session-controller';
import { MovementSubController } from '@app/controllers/movement-sub-controller/movement-sub-controller';
import { CurrentGamesService } from '@app/services/current-games/current-games.service';
import { UsersService } from '@app/services/users/users.service';
import { BoardGame } from '@common/board-game';
import { CurrentGame } from '@common/current-game';
import { SocketClientEventNames, SocketServerEventNames } from '@common/enums/socket-events-names';
import { Item } from '@common/item';
import { Pair } from '@common/pair';
import { Player } from '@common/player';
import { Position } from '@common/position';
import * as dataForm from '@common/socket-data-forms';
import * as io from 'socket.io';
import { Container } from 'typedi';

export class GameScheduler {
    private gameMap: Map<string, GameSessionController>;
    private playerMap: Map<string, Pair<Player, string>>;

    constructor(
        private sio: io.Server,
        private gameService: CurrentGamesService,
    ) {
        this.gameMap = new Map<string, GameSessionController>();
        this.playerMap = new Map<string, Pair<Player, string>>();
    }

    getGameController(id: string): GameSessionController | undefined {
        return this.gameMap.get(id);
    }

    createGame(game: CurrentGame): void {
        const newBoard: BoardGame = game.boardGame;
        const newGameSession: GameSession = new GameSession(newBoard);
        const newClockManager: GameClockManager = new GameClockManager(newGameSession, this.sio, game.id);

        const usersService = Container.get(UsersService);

        const newMovementSubController: MovementSubController = new MovementSubController(newGameSession, game.id, this.sio);

        // Create controller first without FightSubController
        const newController: GameSessionController = new GameSessionController(
            newGameSession,
            this.sio,
            newClockManager,
            null, // Will be set after
            newMovementSubController,
            this.gameService,
        );

        // Now create FightSubController with controller reference
        const newFightSubController: FightSubController = new FightSubController(
            newClockManager,
            newGameSession,
            game.id,
            this.sio,
            usersService,
            newController, // Pass the controller
        );

        // Set the fight controller on the game controller
        newController.setFightSubController(newFightSubController);

        newController.gameId = game.id;

        this.sio.on('connection', (socket: io.Socket) => {
            newController.handleCommand(socket);
        });

        this.gameMap.set(game.id, newController);
    }

    joinGame(player: Player, game: CurrentGame, socket: io.Socket): void {
        const controller: GameSessionController = this.gameMap.get(game.id);
        if (!controller) return;
        controller.addPlayer(player);
        this.playerMap.set(socket.id, { firsElement: player, secondElement: game.id });
    }

    joinActiveGame(player: Player, game: CurrentGame): dataForm.UpdateGamedRes | null {
        const controller: GameSessionController = this.gameMap.get(game.id);
        if (!controller) return null;
        const ans = controller.addActivePlayer(player);
        this.playerMap.set(player.socketId, { firsElement: player, secondElement: game.id });
        return ans;
    }

    joinGameVp(player: Player, game: CurrentGame, socket: VpSocketManager): void {
        const controller: GameSessionController = this.gameMap.get(game.id);
        if (!controller) return;

        player.socketId = socket.clientSocket.id;

        controller.addPlayer(player);
        this.playerMap.set(socket.clientSocket.id, { firsElement: player, secondElement: game.id });
    }

    startGame(gameId: string): void {
        const controller: GameSessionController = this.gameMap.get(gameId);
        if (!controller) return;
        controller.startGame();
    }

    async disconnectPlayer(socketId: string): Promise<void> {
        const timeForInterval = 30;
        let count = 0;
        const countMax = 1000;
        const pair: Pair<Player, string> = this.playerMap.get(socketId);
        if (!pair) return;
        const player: Player = pair.firsElement;
        const gameCode: string = pair.secondElement;

        if (!player || !gameCode) return;
        const controller: GameSessionController = this.gameMap.get(gameCode);

        this.playerMap.delete(socketId);

        if (controller) {
            const interval = setInterval(async () => {
                try {
                    ++count;
                    if (!controller.playerIsMoving(player) || count >= countMax) {
                        clearInterval(interval);
                        await controller.removePlayer(player);
                        if (controller.gameOver()) {
                            await this.deleteGame(gameCode);
                        }
                    }
                } catch {
                    clearInterval(interval);
                }
            }, timeForInterval);
        }
    }

    handleCommand(socket: io.Socket): void {
        socket.on(SocketServerEventNames.Move, (data: dataForm.MoveReq) => {
            this.checkController(data.gameCode, socket);
            this.movePlayer(data.gameCode, data.path, socket, data.isMovingToItem);
        });

        socket.on(SocketServerEventNames.ToggleDoorState, (data: dataForm.ToggleDoorStateReq) => {
            this.checkController(data.gameCode, socket);
            this.toggleDoorState(data.gameCode, data.doorPosition);
        });

        socket.on(SocketServerEventNames.UseTeleporter, (data: dataForm.UseTeleporterReq) => {
            this.checkController(data.gameCode, socket);
            this.useTeleporter(data.gameCode, data.position, socket);
        });

        socket.on(SocketServerEventNames.StartFight, (data: dataForm.StartFightReq) => {
            this.checkController(data.gameCode, socket);
            this.startFight(data.gameCode, data.targetPlayerPosition);
        });

        socket.on(SocketServerEventNames.ExecuteAttack, (data: dataForm.ExecuteAttackReq) => {
            this.checkController(data.gameCode, socket);
            this.executeAttack(data.gameCode);
        });

        socket.on(SocketServerEventNames.AttemptEscape, (data: dataForm.EscapeAttemptReq) => {
            this.checkController(data.gameCode, socket);
            this.attemptEscape(data.gameCode);
        });

        socket.on(SocketServerEventNames.EndTurn, (data: dataForm.EndTurnReq) => {
            this.checkController(data.gameCode, socket);
            this.endTurn(data.gameCode);
        });

        socket.on(SocketServerEventNames.ToggleDebugMode, (data: dataForm.ToggleDebugModeReq) => {
            this.checkController(data.gameCode, socket);
            this.toggleDebugMode(data.gameCode);
        });
        socket.on(SocketServerEventNames.Teleport, (data: dataForm.TeleportPlayerReq) => {
            this.checkController(data.gameCode, socket);
            this.teleportPlayer(data.oldPosition, data.newPosition, data.gameCode);
        });
        socket.on(SocketServerEventNames.PickUpItem, (data: dataForm.PickUpItemReq) => {
            this.checkController(data.gameCode, socket);
            this.pickUpItem(data.player, data.gameCode);
        });
        socket.on(SocketServerEventNames.DropItem, (data: dataForm.DropItemReq) => {
            this.checkController(data.gameCode, socket);
            this.dropItem(data.player, data.item, data.gameCode);
        });
        socket.on(SocketServerEventNames.HandleTrap, (data: dataForm.HandleTrapChoice) => {
            this.checkController(data.gameCode, socket);
            this.handleTrapChoice(data.gameCode, data);
        });
        socket.on(SocketServerEventNames.GetActivePlayer, (data: dataForm.GetActivePlayerReq) => {
            this.checkController(data.gameCode, socket);
            this.getActivePlayer(data.gameCode);
        });
    }

    private getActivePlayer(gameId: string) {
        const controller: GameSessionController = this.gameMap.get(gameId);
        if (controller) {
            controller.getActivePlayer();
        }
    }

    private useTeleporter(gameId: string, position: Position, socket: io.Socket): void {
        const controller: GameSessionController = this.gameMap.get(gameId);
        if (controller) {
            controller.useTeleporter(position, socket);
        }
    }

    private movePlayer(gameId: string, path: Position[], socket: io.Socket, isMovingToItem?: boolean): void {
        const controller: GameSessionController = this.gameMap.get(gameId);
        if (controller) {
            controller.movePlayer(path, socket, isMovingToItem);
        }
    }

    private toggleDoorState(gameId: string, doorPosition: Position): void {
        const controller: GameSessionController = this.gameMap.get(gameId);
        if (controller) {
            controller.toggleDoorState(doorPosition);
        }
    }

    private startFight(gameId: string, targetPosition: Position): void {
        const controller: GameSessionController = this.gameMap.get(gameId);
        if (controller) {
            controller.startFight(targetPosition);
        }
    }

    private executeAttack(gameId: string): void {
        const controller: GameSessionController = this.gameMap.get(gameId);
        if (controller) {
            controller.executeAttack();
        }
    }

    private sendError(socket: io.Socket, message: string): void {
        const ans: dataForm.ServerError = {
            message,
        };
        socket.emit(SocketClientEventNames.ServerError, ans);
    }

    private checkController(gameCode: string, socket: io.Socket): void {
        if (!this.gameMap.get(gameCode)) {
            this.sendError(socket, 'partie introuvable');
        }
    }

    private attemptEscape(gameId: string): void {
        const controller: GameSessionController = this.gameMap.get(gameId);
        if (controller) {
            controller.attemptEscape();
        }
    }

    private endTurn(gameId: string): void {
        const controller: GameSessionController = this.gameMap.get(gameId);
        if (controller) {
            controller.endTurn();
        }
    }

    private async deleteGame(gameId: string): Promise<void> {
        const controller = this.gameMap.get(gameId);
        let count = 0;
        const countMax = 20;
        const retrialIntervalMsec = 150;
        if (controller) {
            if (controller.hasGameStarted()) {
                const interval = setInterval(async () => {
                    try {
                        ++count;

                        const game = await this.gameService.getGame(gameId);
                        if (game && count < countMax) {
                            if (game.players.length === 0) {
                                await this.gameService.deleteGame(gameId);

                                clearInterval(interval);
                            }
                        } else {
                            clearInterval(interval);
                        }
                    } catch {
                        clearInterval(interval);
                    }
                }, retrialIntervalMsec);
            }
        }

        this.gameMap.delete(gameId);
    }

    private toggleDebugMode(gameId: string): void {
        const controller: GameSessionController = this.gameMap.get(gameId);
        if (controller) {
            controller.toggleDebugMode();
        }
    }
    private teleportPlayer(oldPosition: Position, newPosition: Position, gameId: string): void {
        const controller: GameSessionController = this.gameMap.get(gameId);
        if (controller) {
            controller.teleportPlayer(oldPosition, newPosition);
        }
    }

    private pickUpItem(player: Player, gameId: string): void {
        const controller: GameSessionController = this.gameMap.get(gameId);
        if (controller) {
            controller.pickUpItem(player);
        }
    }

    private dropItem(player: Player, item: Item, gameId: string): void {
        const controller: GameSessionController = this.gameMap.get(gameId);
        if (controller) {
            controller.dropItem(player, item);
        }
    }
    private handleTrapChoice(gameId: string, choice: dataForm.HandleTrapChoice): void {
        const controller: GameSessionController = this.gameMap.get(gameId);
        if (controller) {
            controller.handleTrapChoice(choice);
        }
    }
}

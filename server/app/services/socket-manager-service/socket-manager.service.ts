import { FightVpSocketEvent } from '@app/classes/fight-vp-socket-event/fight-vp-socket-event';
import { GameScheduler } from '@app/classes/game-scheduler/game-scheduler';
import { GameVpSocketEvent } from '@app/classes/game-vp-socket-event/game-vp-socket-event';
import { VirtualPlayerManager } from '@app/classes/virtual-player-manager/virtual-player-manager';
import { VpBehaviorInFight } from '@app/classes/vp-behavior-in-fight/vp-behavior-in-fight';
import { VpBehaviorInGame } from '@app/classes/vp-behavior-in-game/vp-behavior-in-game';
import { VpGameSessionManager } from '@app/classes/vp-game-session/vp-game-session-manager';
import { VpSocketAddingHandler } from '@app/classes/vp-socket-adding-handler/vp-socket-adding-handler';
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { ChannelDoc } from '@app/interfaces/channel-doc';
import { VpSocketAddingHandlerConfig } from '@app/interfaces/vp-socket-adding-handler-config';
import { CurrentGamesService } from '@app/services/current-games/current-games.service';
import { SocketGameCommunication } from '@app/services/socket-game-communication/socket-game-communication.service';
import { CHANNEL_GENERAL_ID, GAME_ROOM_REGEX } from '@common/constants/chat.constants';
import { CurrentGame } from '@common/current-game';
import { PlayerLimits } from '@common/enums/players-limit';
import { Player } from '@common/player';
import { AvatarManagement, RoomManagement } from '@common/socket-data-forms';
import * as http from 'http';
import { Collection } from 'mongodb';
import * as io from 'socket.io';
import { DatabaseService } from '../database/database.service';
import { UserSessionController } from '@app/controllers/user-session-controller/user-session-controller';
import Container from 'typedi';
import { UsersService } from '../users/users.service';
export class SocketManager {
    playerSocketMap = new Map<string, string>();

    private sio: io.Server;
    private gameScheduler: GameScheduler;
    private userSessionController: UserSessionController;
    private games: Record<string, Set<string>> = {};
    private vpManagers: Map<string, VirtualPlayerManager> = new Map();
    private vpSockets: Map<string, VpSocketManager> = new Map();
    private gameVpSocketEvents = new Map<string, GameVpSocketEvent>();
    private fightVpSocketEvents = new Map<string, FightVpSocketEvent>();

    private vpBehaviorsInGame: Map<string, VpBehaviorInGame> = new Map();
    private vpBehaviorsInFight: Map<string, VpBehaviorInFight> = new Map();
    private vpGameSessionManagers: Map<string, VpGameSessionManager> = new Map();

    private vpSocketAddingHandler: VpSocketAddingHandler;
    private socketGameCommunication: SocketGameCommunication;

    constructor(
        server: http.Server,
        private gameService: CurrentGamesService,
        private databaseService: DatabaseService,
    ) {
        this.sio = new io.Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
        this.gameScheduler = new GameScheduler(this.sio, this.gameService);
        this.userSessionController = new UserSessionController(this.sio, Container.get(UsersService));
        this.socketGameCommunication = new SocketGameCommunication(this.sio, this.databaseService);
        const vpSocketAddingHandlerConfig: VpSocketAddingHandlerConfig = {
            sio: this.sio,
            gameService: this.gameService,
            gameScheduler: this.gameScheduler,
            vpManagers: this.vpManagers,
            vpSockets: this.vpSockets,
            gameVpSocketEvents: this.gameVpSocketEvents,
            fightVpSocketEvents: this.fightVpSocketEvents,
            vpBehaviorsInGame: this.vpBehaviorsInGame,
            vpBehaviorsInFight: this.vpBehaviorsInFight,
            vpGameSessionManagers: this.vpGameSessionManagers,
            games: this.games,
        };
        this.vpSocketAddingHandler = new VpSocketAddingHandler(vpSocketAddingHandlerConfig);
    }

    handleSockets(): void {
        this.sio.on('connection', (socket: io.Socket) => {
            this.userSessionController.handleUserConnection(socket);
            this.gameScheduler.handleCommand(socket);
            this.socketGameCommunication.handleSockets(socket);

            socket.on('create-game', async (game: CurrentGame, callback) => {
                game.adminId = socket.id;
                const createdGame = await this.gameService.createGame(game);
                this.gameScheduler.createGame(game);
                socket.join(createdGame.id);
                this.vpManagers.set(createdGame.id, new VirtualPlayerManager());
                callback(game);
            });

            socket.on('toggle-lock', async (gameId: string, callback) => {
                const game = await this.gameService.getGame(gameId);
                if (game) {
                    game.locked = !game.locked;
                    await this.gameService.updateGame(game);
                    this.sio.to(gameId).emit('lock-updated', game);
                    callback(game.locked);
                } else {
                    callback(false);
                }
            });

            socket.on('update-game-start', async (gameId: string) => {
                const game = await this.gameService.getGame(gameId);

                game.started = true;
                await this.gameService.updateGame(game);
            });

            socket.on('avatar-selection', (data: AvatarManagement, callback) => {
                const { gameId, avatar } = data;
                if (!this.games[gameId]) {
                    this.games[gameId] = new Set();
                }

                if (this.games[gameId].has(avatar)) {
                    callback(this.games[gameId]);
                    return;
                }

                this.games[gameId].add(avatar);
                this.sio.to(gameId).emit('avatar-list-updated', Array.from(this.games[gameId]));
                callback(Array.from(this.games[gameId]));
            });

            socket.on('avatar-deselection', (data: AvatarManagement, callback) => {
                const { gameId, avatar } = data;
                if (this.games[gameId]) {
                    this.games[gameId].delete(avatar);
                    this.sio.to(gameId).emit('avatar-list-updated', Array.from(this.games[gameId]));
                }
                callback(Array.from(this.games[gameId]));
            });

            socket.on('get-selected-avatars', async (gameId: string, callback) => {
                if (this.games[gameId]) {
                    callback(Array.from(this.games[gameId]));
                } else {
                    callback([]);
                }
            });

            socket.on('join-room', async (gameId: string) => {
                const game = await this.gameService.getGame(gameId);
                if (game) {
                    socket.join(gameId);
                }
                this.sio.to(gameId).emit('avatar-room-joined');
            });

            socket.on('join-game', async (data: RoomManagement, callback) => {
                const { gameId, player } = data;
                const game = await this.gameService.getGame(gameId);
                if (game) {
                    const playerWithId: Player = { ...player, socketId: socket.id };
                    await this.gameService.addPlayer(playerWithId, gameId);
                    this.gameScheduler.joinGame(playerWithId, game, socket);
                    socket.join(gameId);

                    this.sio.to(gameId).emit('player-joined', playerWithId);

                    const maxPlayers = PlayerLimits[game.boardGame.size].maxPlayers;

                    if (game.players.length >= maxPlayers && !game.locked) {
                        game.locked = true;
                        await this.gameService.updateGame(game);
                        this.sio.to(gameId).emit('lock-updated', game);
                    }

                    callback(game);
                } else {
                    return;
                }
            });

            socket.on('start-game', async (gameId: string) => {
                const game = await this.gameService.getGame(gameId);
                if (game) {
                    this.gameScheduler.startGame(gameId);
                }
            });

            socket.on('admin-leaving', async (gameId: string) => {
                const game = await this.gameService.getGame(gameId);
                if (!game) {
                    return;
                }

                for (const player of game.players) {
                    await this.gameService.removePlayer(player, game.id);
                    this.sio.to(game.id).emit('player-left', player);
                    this.games[game.id].delete(player.character);
                    this.sio.to(game.id).emit('avatar-list-updated', Array.from(this.games[game.id]));

                    if (player.virtualPlayer) {
                        const vpManager = this.vpManagers.get(gameId);
                        if (vpManager) {
                            vpManager.releaseVpName(player.name);
                        }
                        this.gameScheduler.disconnectPlayer(player.socketId);
                        const vpSocket = this.vpSockets.get(player.socketId);
                        if (vpSocket) {
                            vpSocket.clientSocket.disconnect();
                            this.vpSockets.delete(player.socketId);
                            this.gameVpSocketEvents.delete(player.socketId);
                            this.fightVpSocketEvents.delete(player.socketId);
                            this.vpGameSessionManagers.delete(player.socketId);
                            this.vpBehaviorsInGame.delete(player.socketId);
                            this.vpBehaviorsInFight.delete(player.socketId);
                        }
                    }
                }
                this.sio.socketsLeave(game.id);
                await this.gameService.deleteGame(game.id);
                this.sio.to(gameId).emit('admin-left', gameId);
            });

            socket.on('leave-game', async (data: RoomManagement) => {
                const { gameId, player } = data;
                const game = await this.gameService.getGame(gameId);
                if (!game) return;

                const playerToRemove = game.players.find((playerToRemoveFound) => playerToRemoveFound.socketId === player.socketId);
                if (playerToRemove) {
                    await this.gameService.removePlayer(playerToRemove, gameId);
                    this.gameScheduler.disconnectPlayer(player.socketId);

                    this.sio.to(gameId).emit('player-left', playerToRemove);

                    if (playerToRemove.virtualPlayer) {
                        const vpManager = this.vpManagers.get(gameId);
                        if (vpManager) {
                            vpManager.releaseVpName(playerToRemove.name);
                        }
                    }
                }

                if (game.adminId === socket.id) {
                    this.sio.to(game.id).emit('admin-left', game);
                }

                await this.gameService.removePlayer(player, gameId);
                this.sio.to(gameId).emit('player-left', player);

                if (this.games[gameId]) {
                    this.games[gameId].delete(player.character);
                    this.sio.to(gameId).emit('avatar-list-updated', Array.from(this.games[gameId]));
                }

                socket.leave(gameId);

                const updatedGame = await this.gameService.getGame(gameId);
                if (updatedGame) {
                    const maxPlayers = PlayerLimits[updatedGame.boardGame.size].maxPlayers;
                    if (updatedGame.players.length < maxPlayers && updatedGame.locked) {
                        updatedGame.locked = false;
                        await this.gameService.updateGame(updatedGame);
                    }
                    this.sio.to(gameId).emit('lock-updated', updatedGame);
                }
            });

            socket.on('kick-player', async (data: RoomManagement) => {
                const { gameId, player } = data;
                await this.gameService.removePlayer(player, gameId);
                this.gameScheduler.disconnectPlayer(player.socketId);
                this.sio.to(gameId).emit('kicked', player);

                if (this.games[gameId]) {
                    this.games[gameId].delete(player.character);
                    this.sio.to(gameId).emit('avatar-list-updated', Array.from(this.games[gameId]));
                }

                if (player.virtualPlayer) {
                    const vpManager = this.vpManagers.get(gameId);
                    if (vpManager) {
                        vpManager.releaseVpName(player.name);
                    }
                    this.gameScheduler.disconnectPlayer(player.socketId);
                    const vpSocket = this.vpSockets.get(player.socketId);
                    if (vpSocket) {
                        vpSocket.clientSocket.disconnect();
                        this.vpSockets.delete(player.socketId);
                        this.gameVpSocketEvents.delete(player.socketId);
                        this.fightVpSocketEvents.delete(player.socketId);
                        this.vpGameSessionManagers.delete(player.socketId);
                        this.vpBehaviorsInGame.delete(player.socketId);
                        this.vpBehaviorsInFight.delete(player.socketId);
                    }
                }

                const updatedGame = await this.gameService.getGame(gameId);
                if (updatedGame) {
                    const maxPlayers = PlayerLimits[updatedGame.boardGame.size].maxPlayers;
                    if (updatedGame.players.length < maxPlayers && updatedGame.locked) {
                        updatedGame.locked = false;
                        await this.gameService.updateGame(updatedGame);
                    }
                    this.sio.to(gameId).emit('lock-updated', updatedGame);
                }
            });

            socket.on('get-game', async (gameId: string, callback) => {
                const game = await this.gameService.getGame(gameId);
                callback(game || null);
            });

            socket.on('delete-game', async (gameId: string) => {
                await this.gameService.deleteGame(gameId);
            });

            socket.on('disconnecting', async () => {
                const rooms: Set<string> = socket.rooms;
                const roomsWithSize: Map<string, number> = new Map();

                rooms.forEach((room) => roomsWithSize.set(room, this.sio.sockets.adapter.rooms.get(room)?.size ?? 0));

                const socketId = socket.id;
                await this.purgeChatHistoryIfRoomEmpty(socketId, roomsWithSize);
                await this.purgeCurrentGames(socketId, roomsWithSize);
            });

            socket.on('leave-active-game', async (data: { player: Player }) => {
                const { player } = data;
                await this.gameScheduler.disconnectPlayer(player.socketId);
            });

            socket.on('disconnect', async () => {
                await this.gameScheduler.disconnectPlayer(socket.id);

                const games = await this.gameService.getAllGames();
                if (!games) return;

                for (const game of games) {
                    if (game.adminId === socket.id && !game.started) {
                        await this.gameService.deleteGame(game.id);
                        this.sio.to(game.id).emit('admin-left', game);
                        this.sio.socketsLeave(game.id);
                        this.vpManagers.delete(game.id);
                        socket.disconnect();
                        return;
                    }

                    const player = game.players.find((disconnectedPlayer) => disconnectedPlayer.socketId === socket.id);
                    if (player) {
                        if (this.games[game.id]) {
                            this.games[game.id].delete(player.character);
                            this.sio.to(game.id).emit('avatar-list-updated', Array.from(this.games[game.id]));
                        }

                        await this.gameService.removePlayer(player, game.id);
                        this.sio.to(game.id).emit('player-left', player);

                        const updatedGame = await this.gameService.getGame(game.id);
                        if (!updatedGame) {
                            socket.leave(game.id);
                            socket.disconnect();
                            return;
                        }

                        const remainingPlayers = updatedGame.players.filter((p) => !p.virtualPlayer);
                        if (remainingPlayers.length === 0) {
                            const gameController = this.gameScheduler['gameMap'].get(game.id);
                            if (gameController) {
                                gameController['endGame']();
                            }

                            const virtualPlayers = updatedGame.players.filter((p) => p.virtualPlayer);
                            for (const vp of virtualPlayers) {
                                const vpSocket = this.vpSockets.get(vp.socketId);
                                if (vpSocket) {
                                    vpSocket.clientSocket.removeAllListeners();
                                    vpSocket.clientSocket.disconnect();
                                    this.vpSockets.delete(vp.socketId);
                                    this.vpBehaviorsInGame.delete(vp.socketId);
                                    this.vpBehaviorsInFight.delete(vp.socketId);
                                    this.gameVpSocketEvents.delete(vp.socketId);
                                    this.fightVpSocketEvents.delete(vp.socketId);
                                    this.vpGameSessionManagers.delete(vp.socketId);
                                }

                                await this.gameService.removePlayer(vp, game.id);
                                this.sio.to(game.id).emit('player-left', vp);
                                if (vp.virtualPlayer) {
                                    const vpManager = this.vpManagers.get(game.id);
                                    if (vpManager) {
                                        vpManager.releaseVpName(vp.name);
                                    }
                                }
                            }

                            this.sio.socketsLeave(game.id);
                            this.vpManagers.delete(game.id);
                            this.gameScheduler['gameMap'].delete(game.id);
                        }

                        socket.leave(game.id);
                        socket.disconnect();
                    }
                }
            });

            this.vpSocketAddingHandler.register(socket);
        });
    }

    private async purgeChatHistoryIfRoomEmpty(socketID: string, rooms: Map<string, number>): Promise<void> {
        try {
            for (const room of rooms) {
                if (room[0] === socketID || room[0] === CHANNEL_GENERAL_ID) continue;

                const sizeBeforeLeave = room[1];

                if (sizeBeforeLeave > 1) continue;

                if (GAME_ROOM_REGEX.test(room[0])) {
                    await this.databaseService.database.collection(process.env.CHAT_COLLECTION_NAME).deleteMany({ roomId: room[0] });
                } else {
                    const collection: Collection<ChannelDoc> = this.databaseService.database.collection(process.env.CHANNEL_COLLECTION_NAME);

                    const channel = await collection.findOne({ id: room[0] });

                    if (!channel) {
                        await this.databaseService.database.collection(process.env.CHAT_COLLECTION_NAME).deleteMany({ roomId: room[0] });
                    }
                }
            }
        } catch (err) {
            console.error('purgeChatHistoryIfRoomEmpty failed:', err);
        }
    }
    private async purgeCurrentGames(socketID: string, rooms: Map<string, number>): Promise<void> {
        try {
            for (const room of rooms) {
                if (room[0] === socketID || room[0] === CHANNEL_GENERAL_ID) continue;

                const sizeBeforeLeave = room[1];

                if (sizeBeforeLeave > 1) continue;

                const regex = /^\d{4}$/;
                if (!regex.test(room[0])) continue;

                await this.gameService.deleteGame(room[0]);
            }
        } catch (err) {
            console.error('purgeCurrentGames failed:', err);
        }
    }
}

/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable no-dupe-class-members */
/* eslint-disable no-restricted-imports */
/* eslint-disable no-unused-vars */
import { AvatarContainer } from '@app/classes/avatar-container';
/* eslint-disable no-console */
/* eslint-disable max-lines */
import { FightVpSocketEvent } from '@app/classes/fight-vp-socket-event/fight-vp-socket-event';
import { GameScheduler } from '@app/classes/game-scheduler/game-scheduler';
import { GameVpSocketEvent } from '@app/classes/game-vp-socket-event/game-vp-socket-event';
import { UserSessionManager } from '@app/classes/user-session-manager/user-session-manager';
import { VirtualPlayerManager } from '@app/classes/virtual-player-manager/virtual-player-manager';
import { VpBehaviorInFight } from '@app/classes/vp-behavior-in-fight/vp-behavior-in-fight';
import { VpBehaviorInGame } from '@app/classes/vp-behavior-in-game/vp-behavior-in-game';
import { VpGameSessionManager } from '@app/classes/vp-game-session/vp-game-session-manager';
import { VpSocketAddingHandler } from '@app/classes/vp-socket-adding-handler/vp-socket-adding-handler';
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { UserSessionController } from '@app/controllers/user-session-controller/user-session-controller';
import { friendEvents } from '@app/events/friendEvents';
import { ChannelDoc } from '@app/interfaces/channel-doc';
import { VpSocketAddingHandlerConfig } from '@app/interfaces/vp-socket-adding-handler-config';
import { CurrentGamesService } from '@app/services/current-games/current-games.service';
import { DatabaseService } from '@app/services/database/database.service';
import { SocketGameCommunication } from '@app/services/socket-game-communication/socket-game-communication.service';
import { CHANNEL_GENERAL_ID, GAME_ROOM_REGEX } from '@common/constants/chat.constants';
import { CurrentGame, CurrentGamePhase, JoinGameAck } from '@common/current-game';
import { GamePrivacy } from '@common/enums/game-visibility';
import { PlayerLimits } from '@common/enums/players-limit';
import { SocketEventNames } from '@common/enums/socket-events-names';
import { Player } from '@common/player';
import { AvatarManagement, RoomManagement } from '@common/socket-data-forms';
import * as http from 'http';
import { Collection } from 'mongodb';
import * as io from 'socket.io';
import { Container } from 'typedi';
import { BoardGameService } from '../board-game/board-game.service';
import { ChannelSocketManager } from '../channel/channel-socket-manager';
import { FriendSocketManager } from '../friends/friend-socket.manager';
import { UsersService } from '../users/users.service';
export class SocketManager {
    playerSocketMap = new Map<string, string>();

    private sio: io.Server;
    private gameScheduler: GameScheduler;
    private friendSocketManager: FriendSocketManager;
    private channelSocketManager: ChannelSocketManager;
    private userSessionController: UserSessionController;
    private userSessionManager: UserSessionManager;
    private avatarContainer = new AvatarContainer();
    private vpManagers: Map<string, VirtualPlayerManager> = new Map();
    private vpSockets: Map<string, VpSocketManager> = new Map();
    private gameVpSocketEvents = new Map<string, GameVpSocketEvent>();
    private fightVpSocketEvents = new Map<string, FightVpSocketEvent>();

    private vpBehaviorsInGame: Map<string, VpBehaviorInGame> = new Map();
    private vpBehaviorsInFight: Map<string, VpBehaviorInFight> = new Map();
    private vpGameSessionManagers: Map<string, VpGameSessionManager> = new Map();

    private vpSocketAddingHandler: VpSocketAddingHandler;
    private socketGameCommunication: SocketGameCommunication;
    private boardGameService: BoardGameService;
    private refundedGames = new Set<string>();
    private preCurrentGames = new Set<string>();

    constructor(
        server: http.Server,
        private gameService: CurrentGamesService,
        private databaseService: DatabaseService,
    ) {
        this.sio = new io.Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
        this.userSessionManager = new UserSessionManager();
        console.log('🔧 UserSessionManager created');
        this.gameService.setIo(this.sio);
        this.gameScheduler = new GameScheduler(this.sio, this.gameService);
        this.userSessionController = new UserSessionController(this.sio, Container.get(UsersService), this.userSessionManager);
        this.socketGameCommunication = new SocketGameCommunication(
            this.sio,
            this.databaseService,
            (socketId: string) => this.userSessionManager.getFirebaseIdBySocketId(socketId),
            this.gameService,
        );
        this.boardGameService = Container.get(BoardGameService);
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
            avatarContainer: this.avatarContainer,
        };
        this.vpSocketAddingHandler = new VpSocketAddingHandler(vpSocketAddingHandlerConfig);
        this.friendSocketManager = new FriendSocketManager(this.sio, this.userSessionManager);
        this.channelSocketManager = new ChannelSocketManager(this.sio, this.userSessionManager, this.databaseService);

        friendEvents.on('vp-eliminated', (payload: { player: Player; gameId: string }) => {
            const { player, gameId } = payload;
            const vpManager = this.vpManagers.get(gameId);
            vpManager?.releaseVpName(player.name);
            const vpSocket = this.vpSockets.get(player.socketId);
            if (vpSocket) {
                vpSocket.clientSocket.removeAllListeners();
                vpSocket.clientSocket.disconnect();
            }
            this.vpSockets.delete(player.socketId);
            this.gameVpSocketEvents.delete(player.socketId);
            this.fightVpSocketEvents.delete(player.socketId);
            this.vpGameSessionManagers.delete(player.socketId);
            this.vpBehaviorsInGame.delete(player.socketId);
            this.vpBehaviorsInFight.delete(player.socketId);
            console.log(`vp cleaned -> ${player.socketId}`);
            return;
        });
    }

    handleSockets(): void {
        this.sio.on('connection', (socket: io.Socket) => {
            const { isVirtual } = socket.handshake.query;
            if (isVirtual !== 'true') {
                this.userSessionController.handleUserConnection(socket);
            } else {
                this.userSessionController.vpSocketIds.push(socket.id);
            }
            this.gameScheduler.handleCommand(socket);
            this.socketGameCommunication.handleSockets(socket);
            this.friendSocketManager.handleUserConnection(socket);
            this.channelSocketManager.handleUserConnection(socket);

            socket.on('create-game', async (game: CurrentGame, callback) => {
                try {
                    const userId = socket.data?.userId || socket.handshake.auth?.userId;
                    if (!userId) {
                        callback({ error: 'UNAUTHORIZED' });
                        return;
                    }

                    const boardGame = await this.boardGameService.getBoard(game.boardGame.id);
                    if (!boardGame) {
                        callback({ error: 'GAME_NOT_FOUND' });
                        return;
                    }

                    if (boardGame.privacy === GamePrivacy.Private) {
                        if (boardGame.ownerId !== userId) {
                            callback({ error: 'GAME_PRIVACY_CHANGED' });
                            return;
                        }
                    }

                    // DEBIT ENTRY FEE FOR CREATOR (NEW)
                    if (game.entryPrice > 0) {
                        const debitSuccess = await this.debitPlayer(userId, game.entryPrice);
                        if (!debitSuccess) {
                            callback({ error: 'INSUFFICIENT_FUNDS' });
                            return;
                        }
                    }

                    game.adminId = socket.id;

                    const createdGame = await this.gameService.createGame(game);
                    this.preCurrentGames.add(createdGame.id);
                    this.gameScheduler.createGame(createdGame);
                    socket.join(createdGame.id);
                    this.vpManagers.set(createdGame.id, new VirtualPlayerManager());
                    callback({ success: true, game: createdGame });
                } catch (error) {
                    callback({ error: 'SERVER_ERROR' });
                }
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

            socket.on('toggle-drop-in', async (gameId: string, callback) => {
                const game = await this.gameService.getGame(gameId);
                if (game) {
                    game.dropInEnabled = !game.dropInEnabled;
                    await this.gameService.updateGame(game);
                    this.sio.to(gameId).emit('drop-in-updated', game);
                    callback(game.dropInEnabled);
                } else {
                    callback(false);
                }
            });

            socket.on('update-game-start', async (gameId: string) => {
                const game = await this.gameService.getGame(gameId);

                game.phase = CurrentGamePhase.Running;
                await this.gameService.updateGame(game);
            });

            socket.on('avatar-selection', (data: AvatarManagement, callback) => {
                const { gameId, avatar } = data;
                const ok = this.avatarContainer.selectAvatar(gameId, avatar, socket.id);

                if (!ok) {
                    callback(this.avatarContainer.getSelectedAvatars(gameId));
                    return;
                }
                this.sio.to(gameId).emit('avatar-list-updated', this.avatarContainer.getSelectedAvatars(gameId));

                callback(this.avatarContainer.getSelectedAvatars(gameId));
            });

            socket.on('avatar-deselection', (data: AvatarManagement, callback) => {
                const { gameId, avatar } = data;
                this.avatarContainer.deselectAvatar(gameId, avatar, socket.id);

                this.sio.to(gameId).emit('avatar-list-updated', this.avatarContainer.getSelectedAvatars(gameId));
                callback(this.avatarContainer.getSelectedAvatars(gameId));
            });

            socket.on('get-selected-avatars', async (gameId: string, callback) => {
                callback(this.avatarContainer.getSelectedAvatars(gameId));
            });

            socket.on('join-room', async (data: { gameId: string; isVirtual: boolean }, callback) => {
                const game = await this.gameService.getGame(data.gameId);
                if (!game || game.phase === CurrentGamePhase.Ended) {
                    const response: JoinGameAck = { codeError: true, limitError: false, lockedError: false };
                    callback(response);
                    return;
                }

                if (data.isVirtual) {
                    socket.join(data.gameId);
                    this.sio.to(data.gameId).emit('avatar-room-joined');
                    callback({ game, codeError: false, limitError: false, lockedError: false });
                    return;
                }

                const userId = this.userSessionManager.getFirebaseIdBySocketId(socket.id);

                if (userId) {
                    const joinCheck = await this.gameService.canUserJoinGame(data.gameId, userId, (socketId) =>
                        this.userSessionManager.getFirebaseIdBySocketId(socketId),
                    );
                    if (!joinCheck.canJoin) {
                        const response: JoinGameAck = {
                            codeError: false,
                            limitError: false,
                            lockedError: false,

                            notFriendError: joinCheck.reason === 'NOT_FRIEND_OF_ADMIN',
                            blockedByPlayerError: joinCheck.reason === 'BLOCKED_BY_PLAYER',
                        };
                        callback(response);
                        return;
                    }

                    if (joinCheck.reason === 'USER_BLOCKED_PLAYER_WARNING') {
                        const response: JoinGameAck = {
                            codeError: false,
                            limitError: false,
                            lockedError: false,
                            youBlockedPlayerWarning: true,
                            game: game,
                        };
                        callback(response);
                        return;
                    }
                }

                if ((game.phase === CurrentGamePhase.Waiting && game.locked) || (game.phase === CurrentGamePhase.Running && !game.dropInEnabled)) {
                    const response: JoinGameAck = { codeError: false, limitError: false, lockedError: true };
                    callback(response);
                    return;
                }
                const maxPlayerCount = PlayerLimits[game.boardGame.size].maxPlayers;

                if (
                    game.players.length >= maxPlayerCount ||
                    !this.gameService.canTakeASlot(this.userSessionManager.getFirebaseIdBySocketId(socket.id), game)
                ) {
                    const response: JoinGameAck = { codeError: false, limitError: true, lockedError: false };
                    callback(response);
                    return;
                }
                socket.join(data.gameId);
                this.sio.to(data.gameId).emit('avatar-room-joined');
                callback({ game, codeError: false, limitError: false, lockedError: false });
            });

            socket.on('join-game', async (data: RoomManagement, callback) => {
                const { gameId, player } = data;
                const game = await this.gameService.getGame(gameId);

                if (!game || game.phase === CurrentGamePhase.Ended) {
                    const response: JoinGameAck = { codeError: true, limitError: false, lockedError: false };
                    callback(response);
                    return;
                }
                if (game.adminId === socket.id && this.preCurrentGames.has(gameId)) {
                    this.preCurrentGames.delete(gameId);
                }

                const userId = this.userSessionManager.getFirebaseIdBySocketId(socket.id);

                if (!userId) {
                    console.error('No userId found for socket', socket.id);
                    const response: JoinGameAck = {
                        codeError: false,
                        limitError: false,
                        lockedError: false,
                        insufficientFundsError: true,
                    };
                    callback(response);
                    return;
                }

                const joinCheck = await this.gameService.canUserJoinGame(gameId, userId, (socketId) =>
                    this.userSessionManager.getFirebaseIdBySocketId(socketId),
                );

                if (!joinCheck.canJoin) {
                    const response: JoinGameAck = {
                        codeError: false,
                        limitError: false,
                        lockedError: false,
                        notFriendError: joinCheck.reason === 'NOT_FRIEND_OF_ADMIN',
                        blockedByPlayerError: joinCheck.reason === 'BLOCKED_BY_PLAYER',
                    };
                    callback(response);
                    return;
                }

                if ((game.phase === CurrentGamePhase.Waiting && game.locked) || (game.phase === CurrentGamePhase.Running && !game.dropInEnabled)) {
                    const response: JoinGameAck = { codeError: false, limitError: false, lockedError: true };
                    callback(response);
                    return;
                }

                const maxPlayerCount = PlayerLimits[game.boardGame.size].maxPlayers;

                if (
                    game.players.length >= maxPlayerCount ||
                    !this.gameService.canTakeASlot(this.userSessionManager.getFirebaseIdBySocketId(socket.id), game)
                ) {
                    const response: JoinGameAck = { codeError: false, limitError: true, lockedError: false };
                    callback(response);
                    return;
                }

                const isCreator = game.adminId === socket.id;
                if (game.entryPrice > 0 && !player.virtualPlayer && !isCreator) {
                    const debitSuccess = await this.debitPlayer(userId, game.entryPrice);
                    if (!debitSuccess) {
                        const response: JoinGameAck = {
                            codeError: false,
                            limitError: false,
                            lockedError: false,
                            insufficientFundsError: true,
                        };
                        callback(response);
                        return;
                    }
                }

                const playerWithId: Player = {
                    ...player,
                    eliminated: false,
                    socketId: socket.id,
                    userId: userId,
                };

                if (game.phase === CurrentGamePhase.Running) {
                    await this.gameService.addPlayer(playerWithId, gameId);
                    const ans = this.gameScheduler.joinActiveGame(playerWithId, game);
                    socket.join(gameId);
                    const updatedGame = await this.gameService.getGame(gameId);
                    const joinGameAck: JoinGameAck = {
                        game: updatedGame,
                        player: playerWithId,
                        codeError: false,
                        limitError: false,
                        lockedError: false,
                        updateGamedRes: ans,
                    };
                    callback(joinGameAck);
                    return;
                }
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

                const updatedGame = await this.gameService.getGame(gameId);
                const joinGameAck: JoinGameAck = {
                    game: updatedGame,
                    player: playerWithId,
                    codeError: false,
                    limitError: false,
                    lockedError: false,
                };
                callback(joinGameAck);
            });
            // TODO: MAKE A SOCKET EVENT FROM SERVER TO CLIENT 'player-joined-active' and add logic client side

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

                // Use existing cancelWaitingRoom logic instead of duplicating
                await this.cancelWaitingRoom(game, 'admin-left-waiting');
            });

            socket.on('leave-game', async (data: { gameId: string }) => {
                const { gameId } = data;
                const game = await this.gameService.getGame(gameId);
                if (!game) return;
                const existing = game.players.find((p) => p.socketId === socket.id);
                if (!existing) return;
                await this.leavePlayer(gameId, existing, 'quit');
            });

            socket.on('kick-player', async ({ gameId, player }: RoomManagement) => {
                this.sio.to(gameId).emit('kicked', player);
                const game = await this.gameService.getGame(gameId);
                if (!game) return;
                const existing = game.players.find((p) => p.socketId === player.socketId);
                if (!existing) return;
                await this.leavePlayer(gameId, existing, 'kick');
            });

            socket.on('get-game', async (gameId: string, callback) => {
                const game = await this.gameService.getGame(gameId);
                callback(game || null);
            });

            socket.on(SocketEventNames.GetCurrentGamePreviews, (gameId: string, callback) => {
                // lets get all the games that are in waiting phase and not lock AND all the games that have drop in enabled but are not full yet
                const previews = this.gameService.getCurrentGamePreviews();
                callback(previews);
            });

            socket.on('delete-game', async (gameId: string) => {
                const game = await this.gameService.getGame(gameId);

                if (!game) {
                    return;
                }

                if (this.preCurrentGames.has(gameId) && socket.id === game.adminId) {
                    const userId = this.userSessionManager.getFirebaseIdBySocketId(socket.id);
                    this.refundPlayer(userId, game.entryPrice);
                    this.preCurrentGames.delete(gameId);
                }
                this.cancelWaitingRoom(game, 'admin-left-waiting');
            });

            socket.on('disconnecting', async () => {
                const rooms: Set<string> = socket.rooms;
                const roomsWithSize: Map<string, number> = new Map();

                rooms.forEach((room) => roomsWithSize.set(room, this.sio.sockets.adapter.rooms.get(room)?.size ?? 0));

                const socketId = socket.id;
                await this.purgeChatHistoryIfRoomEmpty(socketId, roomsWithSize);
            });

            socket.on('leave-active-game', async (data: { gameId: string }) => {
                const { gameId } = data;
                const game = await this.gameService.getGame(gameId);
                if (!game) return;
                const existing = game.players.find((p) => p.socketId === socket.id);
                if (!existing) return;
                await this.leavePlayer(gameId, existing, 'quit');
            });

            socket.on('disconnect', async () => {
                await this.gameScheduler.disconnectPlayer(socket.id);

                const games = await this.gameService.getAllGames();
                if (!games) return;

                for (const game of games) {
                    this.avatarContainer.releaseBySocket(game.id, socket.id);
                    this.sio.to(game.id).emit('avatar-list-updated', this.avatarContainer.getSelectedAvatars(game.id));

                    if (this.preCurrentGames.has(game.id) && game.phase === CurrentGamePhase.Waiting && socket.id === game.adminId) {
                        const userId = this.userSessionManager.getFirebaseIdBySocketId(socket.id);
                        this.refundPlayer(userId, game.entryPrice);
                        this.preCurrentGames.delete(game.id);
                    }

                    if (game.players.length === 0 && game.adminId === socket.id && game.phase === CurrentGamePhase.Waiting) {
                        this.cancelWaitingRoom(game, 'admin-left-waiting');
                        return;
                    }
                    const player = game.players.find((disconnectedPlayer) => disconnectedPlayer.socketId === socket.id);
                    if (!player) return;
                    await this.leavePlayer(game.id, player, 'timeout');
                }
            });

            this.vpSocketAddingHandler.register(socket);
        });
    }

    // UPDATE leavePlayer to include refund logic
    private async leavePlayer(gameId: string, player: Player, reason: 'quit' | 'kick' | 'timeout' | 'admin-quit'): Promise<void> {
        const game = await this.gameService.getGame(gameId);
        if (!game) return;

        this.sio.sockets.sockets.get(player.socketId)?.leave(`GAME-${gameId}`);
        const isOrganizer = game.adminId === player.socketId;
        const isWaiting = game.phase === CurrentGamePhase.Waiting;

        if (isOrganizer && isWaiting) {
            await this.cancelWaitingRoom(game, 'admin-left-waiting');
            return;
        }

        if (isWaiting && game.entryPrice > 0 && !player.virtualPlayer) {
            await this.refundPlayer(player.userId, game.entryPrice);
        }

        if (isOrganizer && isWaiting) {
            await this.cancelWaitingRoom(game, 'admin-left-waiting');
            return;
        }

        await this.gameService.removePlayer(player, gameId);

        // MARK as abandoned if game has started (NEW)
        if (!isWaiting) {
            const controller = this.gameScheduler.getGameController(gameId);
            if (controller) {
                controller.session.markPlayerAsAbandoned(player.userId);
            }
        }

        this.gameScheduler.disconnectPlayer(player.socketId);

        this.avatarContainer.releaseBySocket(gameId, player.socketId);
        this.sio.to(game.id).emit('avatar-list-updated', this.avatarContainer.getSelectedAvatars(gameId));

        if (player.virtualPlayer) {
            const vpManager = this.vpManagers.get(gameId);
            vpManager?.releaseVpName(player.name);
            const vpSocket = this.vpSockets.get(player.socketId);
            if (vpSocket) {
                vpSocket.clientSocket.removeAllListeners();
                vpSocket.clientSocket.disconnect();
            }
            this.vpSockets.delete(player.socketId);
            this.gameVpSocketEvents.delete(player.socketId);
            this.fightVpSocketEvents.delete(player.socketId);
            this.vpGameSessionManagers.delete(player.socketId);
            this.vpBehaviorsInGame.delete(player.socketId);
            this.vpBehaviorsInFight.delete(player.socketId);
        }

        this.sio.sockets.sockets.get(player.socketId)?.leave(gameId);
        this.sio.to(gameId).emit('player-left', player);

        const updatedGame = await this.gameService.getGame(gameId);
        if (!updatedGame) return;

        const maxPlayers = PlayerLimits[updatedGame.boardGame.size].maxPlayers;
        if (updatedGame.phase === CurrentGamePhase.Waiting && updatedGame.locked && updatedGame.players.length < maxPlayers) {
            updatedGame.locked = false;
            await this.gameService.updateGame(updatedGame);
            this.sio.to(gameId).emit('lock-updated', updatedGame);
        }

        await this.maybeEndGameAndCleanup(updatedGame);
    }

    private async maybeEndGameAndCleanup(game: CurrentGame): Promise<void> {
        const humanPlayers = game.players.filter((p) => !p.virtualPlayer);
        if (humanPlayers.length === 0) {
            const ctl = this.gameScheduler['gameMap'].get(game.id);
            ctl?.['endGame']?.();

            for (const vp of game.players.filter((p) => p.virtualPlayer)) {
                await this.gameService.removePlayer(vp, game.id);
                this.sio.to(game.id).emit('player-left', { ...vp, reason: 'gc' });
                const vpManager = this.vpManagers.get(game.id);
                vpManager?.releaseVpName(vp.name);
                const vpSocket = this.vpSockets.get(vp.socketId);
                if (vpSocket) {
                    vpSocket.clientSocket.removeAllListeners();
                    vpSocket.clientSocket.disconnect();
                }
                this.vpSockets.delete(vp.socketId);
                this.vpBehaviorsInGame.delete(vp.socketId);
                this.vpBehaviorsInFight.delete(vp.socketId);
                this.gameVpSocketEvents.delete(vp.socketId);
                this.fightVpSocketEvents.delete(vp.socketId);
                this.vpGameSessionManagers.delete(vp.socketId);
            }

            this.sio.socketsLeave(game.id);
            this.vpManagers.delete(game.id);
            this.gameScheduler['gameMap'].delete(game.id);
            this.avatarContainer.clearGame(game.id);
            this.sio.to(game.id).emit('avatar-list-updated', []);

            await this.gameService.deleteGame(game.id);
        }
    }

    private async cancelWaitingRoom(game: CurrentGame, reason: 'admin-left-waiting'): Promise<void> {
        const { id: gameId } = game;

        const existingGame = await this.gameService.getGame(gameId);
        if (!existingGame) {
            console.log(`Game ${gameId} already deleted, skipping cleanup`);
            return;
        }

        // NEW: Prevent duplicate refunds
        if (this.refundedGames.has(gameId)) {
            console.log(`Game ${gameId} already refunded, skipping refunds`);
        } else {
            // Refund all players
            if (game.entryPrice > 0) {
                for (const player of game.players.filter((p) => !p.virtualPlayer)) {
                    await this.refundPlayer(player.userId, game.entryPrice);
                }
            }
            this.refundedGames.add(gameId);
        }

        this.sio.to(game.id).emit('admin-left', game);
        this.avatarContainer.clearGame(game.id);
        this.sio.to(game.id).emit('avatar-list-updated', []);

        // Cleanup VPs
        for (const p of game.players.filter((p) => p.virtualPlayer)) {
            const vpManager = this.vpManagers.get(gameId);
            vpManager?.releaseVpName(p.name);
            const vpSocket = this.vpSockets.get(p.socketId);
            if (vpSocket) {
                vpSocket.clientSocket.removeAllListeners();
                vpSocket.clientSocket.disconnect();
            }
            this.vpSockets.delete(p.socketId);
            this.gameVpSocketEvents.delete(p.socketId);
            this.fightVpSocketEvents.delete(p.socketId);
            this.vpGameSessionManagers.delete(p.socketId);
            this.vpBehaviorsInGame.delete(p.socketId);
            this.vpBehaviorsInFight.delete(p.socketId);
        }

        this.sio.socketsLeave(gameId);
        this.vpManagers.delete(gameId);
        this.gameScheduler['gameMap'].delete(gameId);
        this.refundedGames.delete(gameId); // Clean up tracking

        await this.gameService.deleteGame(gameId);
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

    private async debitPlayer(userId: string, amount: number): Promise<boolean> {
        try {
            const usersService = Container.get(UsersService);
            const user = await usersService.getUser(userId);

            if (!user || user.money < amount) {
                console.log(`Debit failed for user ${userId}: insufficient funds (has ${user?.money}, needs ${amount})`);
                return false;
            }

            const updatedUser = { ...user, money: user.money - amount };
            await usersService.updateUser(updatedUser);
            console.log(`Debited ${amount} from user ${userId}. New balance: ${updatedUser.money}`);
            return true;
        } catch (error) {
            console.error(`Failed to debit user ${userId}:`, error);
            return false;
        }
    }
    private async refundPlayer(userId: string, amount: number): Promise<void> {
        try {
            const usersService = Container.get(UsersService);
            const user = await usersService.getUser(userId);
            if (!user) return;

            const updatedUser = { ...user, money: user.money + amount };
            await usersService.updateUser(updatedUser);
            console.log(`Refunded ${amount} to user ${userId}. New balance: ${updatedUser.money}`);
        } catch (error) {
            console.error(`Failed to refund user ${userId}:`, error);
        }
    }
}

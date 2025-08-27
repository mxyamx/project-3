import { FightVpSocketEvent } from '@app/classes/fight-vp-socket-event/fight-vp-socket-event';
import { GameScheduler } from '@app/classes/game-scheduler/game-scheduler';
import { GameVpSocketEvent } from '@app/classes/game-vp-socket-event/game-vp-socket-event';
import { VirtualPlayerManager } from '@app/classes/virtual-player-manager/virtual-player-manager';
import { VpBehaviorInFight } from '@app/classes/vp-behavior-in-fight/vp-behavior-in-fight';
import { VpGameSessionManager } from '@app/classes/vp-game-session/vp-game-session-manager';
import { VpBehaviorInGame } from '@app/classes/vp-behavior-in-game/vp-behavior-in-game';
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { VpState } from '@app/classes/vp-state/vp-state';
import { VpSocketAddingHandlerConfig } from '@app/interfaces/vp-socket-adding-handler-config';
import { CurrentGamesService } from '@app/services/current-games/current-games.service';
import { CurrentGame } from '@common/current-game';
import { PlayerLimits } from '@common/enums/players-limit';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import { VpRoomManagement } from '@common/socket-data-forms';
import { VirtualPlayer } from '@common/virtual-player';
import * as io from 'socket.io';
import { Server } from 'socket.io';

export class VpSocketAddingHandler {
    private sio: Server;
    private gameService: CurrentGamesService;
    private gameScheduler: GameScheduler;
    private vpManagers: Map<string, VirtualPlayerManager>;
    private vpSockets: Map<string, VpSocketManager>;
    private gameVpSocketEvents: Map<string, GameVpSocketEvent>;
    private fightVpSocketEvents: Map<string, FightVpSocketEvent>;
    private vpBehaviorsInGame: Map<string, VpBehaviorInGame>;
    private vpBehaviorsInFight: Map<string, VpBehaviorInFight>;
    private vpGameSessionManagers: Map<string, VpGameSessionManager>;
    private games: Record<string, Set<string>>;

    constructor(vpSocketAddingHandlerConfig: VpSocketAddingHandlerConfig) {
        this.sio = vpSocketAddingHandlerConfig.sio;
        this.gameService = vpSocketAddingHandlerConfig.gameService;
        this.gameScheduler = vpSocketAddingHandlerConfig.gameScheduler;
        this.vpManagers = vpSocketAddingHandlerConfig.vpManagers;
        this.vpSockets = vpSocketAddingHandlerConfig.vpSockets;
        this.gameVpSocketEvents = vpSocketAddingHandlerConfig.gameVpSocketEvents;
        this.fightVpSocketEvents = vpSocketAddingHandlerConfig.fightVpSocketEvents;
        this.vpBehaviorsInGame = vpSocketAddingHandlerConfig.vpBehaviorsInGame;
        this.vpBehaviorsInFight = vpSocketAddingHandlerConfig.vpBehaviorsInFight;
        this.vpGameSessionManagers = vpSocketAddingHandlerConfig.vpGameSessionManagers;
        this.games = vpSocketAddingHandlerConfig.games;
    }

    register(socket: io.Socket): void {
        socket.on('add-virtual-player', async (data: VpRoomManagement) => {
            const { gameId, profile } = data;

            const validation = await this.canAddVp(gameId);
            if (!validation) return;
            const { game, vpManager } = validation;

            const vpCtx = this.createVpContext(profile, gameId, game, vpManager);
            if (!vpCtx) return;
            const { virtualPlayer, vpSocketManager, vpState, vpGameSessionManager } = vpCtx;
            const vpSocketId = vpSocketManager.clientSocket.id;

            const behaviorGame = new VpBehaviorInGame();
            const behaviorFight = new VpBehaviorInFight(vpGameSessionManager);

            this.vpSockets.set(vpSocketId, vpSocketManager);
            this.vpBehaviorsInGame.set(vpSocketId, behaviorGame);
            this.vpBehaviorsInFight.set(vpSocketId, behaviorFight);
            this.vpGameSessionManagers.set(vpSocketId, vpGameSessionManager);

            this.wireVpSocket(vpSocketId, behaviorGame, behaviorFight, vpSocketManager, {
                gameId,
                virtualPlayer,
                vpGameSessionManager,
                vpState,
            });

            virtualPlayer.socketId = vpSocketId;
            await this.gameService.addPlayer(virtualPlayer, gameId);
            this.gameScheduler.joinGameVp(virtualPlayer, game, vpSocketManager);
            vpSocketManager.joinRoom(gameId);

            const maxPlayers = PlayerLimits[game.boardGame.size].maxPlayers;
            await this.notifyVpAdded(gameId, virtualPlayer, maxPlayers);
        });
    }

    private async canAddVp(gameId: string): Promise<{ game: CurrentGame; vpManager: VirtualPlayerManager } | null> {
        const game = await this.gameService.getGame(gameId);
        if (!game) return null;

        const max = PlayerLimits[game.boardGame.size].maxPlayers;
        if (game.players.length >= max) return null;

        const vpManager = this.vpManagers.get(gameId);
        if (!vpManager) return null;

        return { game, vpManager };
    }

    private createVpContext(profile: VirtualPlayerProfile, gameId: string, game: CurrentGame, vpManager: VirtualPlayerManager) {
        const virtualPlayer = vpManager.createVirtualPlayer(profile);
        if (!virtualPlayer) return null;

        if (!this.games[gameId]) {
            this.games[gameId] = new Set();
        }

        const usedAvatars = Array.from(this.games[gameId]);
        const availableAvatars = vpManager.availableAvatars.filter((avatar) => !usedAvatars.includes(`assets/avatars/${avatar}`));

        if (availableAvatars.length === 0) {
            return null;
        }

        const randomAvatar = availableAvatars[Math.floor(Math.random() * availableAvatars.length)];
        virtualPlayer.character = `assets/avatars/${randomAvatar}`;

        this.games[gameId].add(virtualPlayer.character);
        this.sio.to(gameId).emit('avatar-list-updated', Array.from(this.games[gameId]));

        const vpSocketManager = new VpSocketManager();
        const vpState = new VpState();
        const vpGameSessionManager = new VpGameSessionManager(vpSocketManager, vpState, {
            initialPlayer: virtualPlayer,
            initialGameId: gameId,
            initialBoardGame: game.boardGame,
            initialListOfPlayers: game.players,
        });

        return { virtualPlayer, vpSocketManager, vpState, vpGameSessionManager };
    }

    private wireVpSocket(
        vpSocketId: string,
        vpBehaviorInGame: VpBehaviorInGame,
        vpBehaviorInFight: VpBehaviorInFight,
        vpSocketManager: VpSocketManager,
        cfg: {
            gameId: string;
            virtualPlayer: VirtualPlayer;
            vpGameSessionManager: VpGameSessionManager;
            vpState: VpState;
        },
    ) {
        const gameEvent = new GameVpSocketEvent(vpBehaviorInGame, cfg);
        const fightEvent = new FightVpSocketEvent(vpBehaviorInFight, cfg);

        this.gameVpSocketEvents.set(vpSocketId, gameEvent);
        this.fightVpSocketEvents.set(vpSocketId, fightEvent);

        vpSocketManager.clientSocket.once('connect', () => {
            gameEvent.configure(vpSocketManager);
            fightEvent.configure(vpSocketManager);
        });
    }

    private async notifyVpAdded(gameId: string, virtualPlayer: VirtualPlayer, maxPlayers: number) {
        this.sio.to(gameId).emit('player-joined', virtualPlayer);
        this.sio.to(gameId).emit('avatar-list-updated', Array.from(this.games[gameId]));

        const updatedGame = await this.gameService.getGame(gameId);
        if (updatedGame && updatedGame.players.length >= maxPlayers && !updatedGame.locked) {
            updatedGame.locked = true;
            await this.gameService.updateGame(updatedGame);
            this.sio.to(gameId).emit('lock-updated', updatedGame);
        }
    }
}

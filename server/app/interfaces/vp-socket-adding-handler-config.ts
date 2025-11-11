import { AvatarContainer } from '@app/classes/avatar-container';
import { FightVpSocketEvent } from '@app/classes/fight-vp-socket-event/fight-vp-socket-event';
import { GameScheduler } from '@app/classes/game-scheduler/game-scheduler';
import { GameVpSocketEvent } from '@app/classes/game-vp-socket-event/game-vp-socket-event';
import { VirtualPlayerManager } from '@app/classes/virtual-player-manager/virtual-player-manager';
import { VpBehaviorInFight } from '@app/classes/vp-behavior-in-fight/vp-behavior-in-fight';
import { VpBehaviorInGame } from '@app/classes/vp-behavior-in-game/vp-behavior-in-game';
import { VpGameSessionManager } from '@app/classes/vp-game-session/vp-game-session-manager';
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { CurrentGamesService } from '@app/services/current-games/current-games.service';
import { Server } from 'socket.io';

export interface VpSocketAddingHandlerConfig {
    sio: Server;
    gameService: CurrentGamesService;
    gameScheduler: GameScheduler;
    vpManagers: Map<string, VirtualPlayerManager>;
    vpSockets: Map<string, VpSocketManager>;
    gameVpSocketEvents: Map<string, GameVpSocketEvent>;
    fightVpSocketEvents: Map<string, FightVpSocketEvent>;
    vpBehaviorsInGame: Map<string, VpBehaviorInGame>;
    vpBehaviorsInFight: Map<string, VpBehaviorInFight>;
    vpGameSessionManagers: Map<string, VpGameSessionManager>;
    avatarContainer: AvatarContainer;
}

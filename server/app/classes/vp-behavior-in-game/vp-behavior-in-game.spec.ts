import { AgressiveCTFBehaviorInGame } from '@app/classes/agressive-ctf-behavior-in-game/agressive-ctf-behavior-in-game';
import { AgressiveNormalBehaviorInGame } from '@app/classes/agressive-normal-behavior-in-game/agressive-normal-behavior-in-game';
import { DefensiveCTFBehaviorInGame } from '@app/classes/defensive-ctf-behavior-in-game/defensive-ctf-behavior-in-game';
import { DefensiveNormalBehaviorInGame } from '@app/classes/defensive-normal-behavior-in-game/defensive-normal-behavior-in-game';
import { VpBehaviorInGame } from '@app/classes/vp-behavior-in-game/vp-behavior-in-game';
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { GameMode } from '@common/enums/game-mode';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import { VirtualPlayer } from '@common/virtual-player';
import { assert } from 'chai';
import * as sinon from 'sinon';

function createFakeVirtualPlayer(profile: VirtualPlayerProfile): VirtualPlayer {
    return {
        name: 'Bot',
        character: 'Warrior',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        attributes: {} as any,
        organizer: false,
        virtualPlayer: true,
        profile,
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createGameState(mode: GameMode): any {
    return {
        boardGame: { gameMode: mode },
    };
}

describe('VpBehaviorInGame', () => {
    let vpBehavior: VpBehaviorInGame;
    let vpSocketStub: VpSocketManager;
    const gameId = 'test-game';

    beforeEach(() => {
        vpBehavior = new VpBehaviorInGame();
        vpSocketStub = {
            clientSocket: {
                emit: sinon.stub(),
            },
        } as unknown as VpSocketManager;
    });

    it('should call AgressiveNormalBehaviorInGame.handleBehavior for Normal + Agressive', () => {
        const player = createFakeVirtualPlayer(VirtualPlayerProfile.Agressive);
        const gameState = createGameState(GameMode.Normal);
        const spy = sinon.spy(AgressiveNormalBehaviorInGame.prototype, 'handleBehavior');

        vpBehavior.handleBehavior(vpSocketStub, gameId, player, gameState);

        assert(spy.calledOnce);
        spy.restore();
    });

    it('should call DefensiveNormalBehaviorInGame.handleBehavior for Normal + Defensive', () => {
        const player = createFakeVirtualPlayer(VirtualPlayerProfile.Defensive);
        const gameState = createGameState(GameMode.Normal);
        const spy = sinon.spy(DefensiveNormalBehaviorInGame.prototype, 'handleBehavior');

        vpBehavior.handleBehavior(vpSocketStub, gameId, player, gameState);

        assert(spy.calledOnce);
        spy.restore();
    });

    it('should call AgressiveCTFBehaviorInGame.handleBehavior for CTF + Agressive', () => {
        const player = createFakeVirtualPlayer(VirtualPlayerProfile.Agressive);
        const gameState = createGameState(GameMode.CTF);
        const spy = sinon.spy(AgressiveCTFBehaviorInGame.prototype, 'handleBehavior');

        vpBehavior.handleBehavior(vpSocketStub, gameId, player, gameState);

        assert(spy.calledOnce);
        spy.restore();
    });

    it('should call DefensiveCTFBehaviorInGame.handleBehavior for CTF + Defensive', () => {
        const player = createFakeVirtualPlayer(VirtualPlayerProfile.Defensive);
        const gameState = createGameState(GameMode.CTF);
        const spy = sinon.spy(DefensiveCTFBehaviorInGame.prototype, 'handleBehavior');

        vpBehavior.handleBehavior(vpSocketStub, gameId, player, gameState);

        assert(spy.calledOnce);
        spy.restore();
    });
});

import { AgressiveNormalBehaviorInGame } from '@app/classes/agressive-normal-behavior-in-game/agressive-normal-behavior-in-game';
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { VpState } from '@app/classes/vp-state/vp-state';
import { CharacterAttributes } from '@common/character-attributes';
import { BoardGameSize } from '@common/enums/board-game-size';
import { DiceBonus } from '@common/enums/dice-bonus';
import { GameMode } from '@common/enums/game-mode';
import { SocketClientEventNames } from '@common/enums/socket-events-names';
import { TileType } from '@common/enums/tile-type';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import { VpPreferenceItem } from '@common/enums/vp-preference-item';
import { GetGameStateRes } from '@common/socket-data-forms';
import { VirtualPlayer } from '@common/virtual-player';
import { assert } from 'chai';
import * as sinon from 'sinon';

const speed = 4;
const health = 4;
function createFakeVirtualPlayer(name: string, speedValue = speed): VirtualPlayer {
    return {
        name,
        character: 'Warrior',
        attributes: { speedValue, healthValue: health } as CharacterAttributes,
        organizer: false,
        virtualPlayer: true,
        profile: VirtualPlayerProfile.Agressive,
        position: { x: 1, y: 1 },
    };
}

describe('AgressiveNormalBehaviorInGame', () => {
    let behavior: AgressiveNormalBehaviorInGame;
    let vpSocketStub: VpSocketManager;
    let virtualPlayer: VirtualPlayer;
    let gameState: GetGameStateRes;

    beforeEach(() => {
        const rows = 10;
        const columns = 10;
        behavior = new AgressiveNormalBehaviorInGame(new VpState());
        virtualPlayer = createFakeVirtualPlayer('Bot');
        vpSocketStub = {
            clientSocket: {
                emit: sinon.stub(),
            },
        } as unknown as VpSocketManager;

        gameState = {
            boardGame: {
                tiles: Array(rows)
                    .fill(null)
                    .map(() => Array(columns).fill({ type: 'grass', containedPlayer: null })),
                id: '',
                name: '',
                description: '',
                size: BoardGameSize.Small,
                gameMode: GameMode.Normal,
                previewImage: '',
                visibility: false,
                lastModified: undefined,
            },
            listOfPlayers: [
                virtualPlayer,
                {
                    name: 'Enemy',
                    position: { x: 2, y: 1 },
                    character: '',
                    attributes: undefined,
                    organizer: false,
                },
            ],
            activePlayer: virtualPlayer,
            successful: true,
            message: '',
        };
    });

    it('should move to attack if enemy is reachable', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const spy = sinon.stub(behavior as any, 'findReachableAdjacentPlayer').returns({
            path: [{ x: 0, y: 1 }],
            position: { x: 0, y: 1 },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const moveSpy = sinon.stub(behavior as any, 'moveVirtualPlayer');

        behavior.handleBehavior(vpSocketStub, 'gameId', virtualPlayer, gameState);
        assert(moveSpy.calledOnce);
        spy.restore();
    });

    it('should move to item if no player is reachable', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(behavior as any, 'findReachableAdjacentPlayer').returns(null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(behavior as any, 'findNearestPlayer').returns(null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const moveSpy = sinon.stub(behavior as any, 'moveVirtualPlayer');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(behavior as any, 'findNearestPreferredItem').returns({
            path: [{ x: 1, y: 1 }],
        });

        behavior.handleBehavior(vpSocketStub, 'gameId', virtualPlayer, gameState);
        assert(moveSpy.calledOnce);
    });

    it('should move to nearest player if no item and no reachable enemy', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(behavior as any, 'findReachableAdjacentPlayer').returns(null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(behavior as any, 'findNearestPreferredItem').returns(null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const moveSpy = sinon.stub(behavior as any, 'moveVirtualPlayer');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(behavior as any, 'findNearestPlayer').returns({
            path: [{ x: 2, y: 2 }],
        });

        behavior.handleBehavior(vpSocketStub, 'gameId', virtualPlayer, gameState);
        assert(moveSpy.calledOnce);
    });

    it('should end turn if no movement possible', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(behavior as any, 'findReachableAdjacentPlayer').returns(null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(behavior as any, 'findNearestPreferredItem').returns(null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sinon.stub(behavior as any, 'findNearestPlayer').returns(null);

        behavior.handleBehavior(vpSocketStub, 'gameId', virtualPlayer, gameState);
        assert((vpSocketStub.clientSocket.emit as sinon.SinonStub).calledWith(SocketClientEventNames.EndTurn, { gameCode: 'gameId' }));
    });

    it('should return early if position is missing', () => {
        virtualPlayer.position = undefined;
        behavior.handleBehavior(vpSocketStub, 'gameId', virtualPlayer, gameState);
        assert((vpSocketStub.clientSocket.emit as sinon.SinonStub).notCalled);
    });
    it('should return Aggressive as preferred item type', () => {
        const result = behavior['getPreferredItemType']();
        assert.equal(result, VpPreferenceItem.Aggressive);
    });

    it('should return a reachable adjacent position if enemy is near', () => {
        const rows = 3;
        const columns = 3;
        virtualPlayer.position = { x: 0, y: 0 };

        const enemy = {
            name: 'Enemy',
            position: { x: 1, y: 1 },
            character: 'Archer',
            attributes: {
                healthValue: 10,
                speedValue: 3,
                attackValue: 5,
                defenseValue: 2,
                bonusAttack: DiceBonus.FourSideBonus,
                bonusDefense: DiceBonus.SixSideBonus,
            },
            organizer: false,
        };

        gameState.boardGame.tiles = Array(rows)
            .fill(null)
            .map(() =>
                Array(columns).fill({
                    type: TileType.Grass,
                    containedPlayer: null,
                }),
            );
        gameState.listOfPlayers = [virtualPlayer, enemy];
        gameState.activePlayer = virtualPlayer;
        behavior['gameState'] = gameState;
        const result = behavior['findReachableAdjacentPlayer'](virtualPlayer);
        assert(result !== null, 'Expected a reachable adjacent player to be found');
        assert.deepEqual(result?.position, { x: 0, y: 1 }, 'Expected adjacent position to be (1, 0)');
    });
    it('should return null if no adjacent position is reachable', () => {
        const rows = 3;
        const columns = 3;
        virtualPlayer.position = { x: 0, y: 0 };

        const distantEnemy = {
            name: 'Enemy',
            position: { x: 3, y: 3 },
            character: 'Archer',
            attributes: {
                healthValue: 10,
                speedValue: 3,
                attackValue: 5,
                defenseValue: 2,
                bonusAttack: DiceBonus.FourSideBonus,
                bonusDefense: DiceBonus.SixSideBonus,
            },
            organizer: false,
        };

        gameState.boardGame.tiles = Array(rows)
            .fill(null)
            .map(() =>
                Array(columns).fill({
                    type: TileType.Grass,
                    containedPlayer: null,
                }),
            );

        gameState.listOfPlayers = [virtualPlayer, distantEnemy];
        gameState.activePlayer = virtualPlayer;
        behavior['gameState'] = gameState;

        const result = behavior['findReachableAdjacentPlayer'](virtualPlayer);
        assert.isNull(result, 'Expected no reachable adjacent player to be found');
    });
});

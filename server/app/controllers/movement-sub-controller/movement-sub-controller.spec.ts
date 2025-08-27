import { GameSession } from '@app/classes/game-session/game-session';
import { MovementSubController } from '@app/controllers/movement-sub-controller/movement-sub-controller';
import { BoardGame } from '@common/board-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { GameMode } from '@common/enums/game-mode';
import { SocketClientEventNames } from '@common/enums/socket-events-names';
import { TileType } from '@common/enums/tile-type';
import { Position } from '@common/position';
import { assert } from 'chai';
import { Server } from 'socket.io';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import sinon = require('sinon');

describe('MovementSubController', () => {
    let controller: MovementSubController;
    let gameSession: GameSession;
    let boardGame: BoardGame;
    let mockServer: Server;
    let emitSpy: sinon.SinonSpy;
    const dummyPos: Position = { x: 0, y: 0 };

    beforeEach(() => {
        emitSpy = sinon.spy();
        mockServer = {
            to: sinon.stub().returns({ emit: emitSpy }),
        } as unknown as Server;

        boardGame = {
            id: 'id',
            name: 'name',
            description: '',
            size: BoardGameSize.Small,
            gameMode: GameMode.Normal,
            tiles: [[{ type: TileType.Grass }]],
            previewImage: '',
            visibility: true,
            itemInfos: [],
            lastModified: new Date(),
        };

        gameSession = new GameSession(boardGame);
        controller = new MovementSubController(gameSession, 'room1', mockServer);
    });

    it('should move player and emit MovePlayer', () => {
        const moveStub = sinon.stub(gameSession, 'movePlayer');
        controller.movePlayer(dummyPos, dummyPos);
        assert.isTrue(moveStub.calledOnce);
        assert.isTrue(emitSpy.calledWith(SocketClientEventNames.MovePlayer, sinon.match.has('successful', true)));
    });

    it('should emit error on movePlayer exception', () => {
        sinon.stub(gameSession, 'movePlayer').throws();
        try {
            controller.movePlayer(dummyPos, dummyPos);
        } catch (e) {
            /* empty */
        }
        assert.isTrue(emitSpy.calledWith(SocketClientEventNames.MovePlayer, sinon.match.has('successful', false)));
        assert.isTrue(emitSpy.calledWith(SocketClientEventNames.ServerError, sinon.match.has('message')));
    });

    it('should end movement and emit MovementOver', () => {
        controller.endMovement();
        assert.isTrue(emitSpy.calledWith(SocketClientEventNames.MovementOver, sinon.match.has('successful', true)));
    });

    it('should toggle door state and emit ToggleDoorState', () => {
        const toggleStub = sinon.stub(gameSession, 'toggleDoorState');
        controller.toggleDoorState(dummyPos);
        assert.isTrue(toggleStub.calledWith(dummyPos));
        assert.isTrue(emitSpy.calledWith(SocketClientEventNames.ToggleDoorState, sinon.match.has('successful', true)));
    });

    it('should emit error on toggleDoorState exception', () => {
        sinon.stub(gameSession, 'toggleDoorState').throws();
        try {
            controller.toggleDoorState(dummyPos);
        } catch (e) {
            /* empty */
        }
        assert.isTrue(emitSpy.calledWith(SocketClientEventNames.ToggleDoorState, sinon.match.has('successful', false)));
        assert.isTrue(emitSpy.calledWith(SocketClientEventNames.ServerError, sinon.match.has('message')));
    });
    it('should teleport player state and emit TeleportPlayer', () => {
        const teleportStub = sinon.stub(gameSession, 'teleport');
        controller.teleportPlayer(dummyPos, dummyPos);
        assert.isTrue(teleportStub.calledWith(dummyPos, dummyPos));
        assert.isTrue(emitSpy.calledWith(SocketClientEventNames.Teleport, sinon.match.has('successful', true)));
    });
});

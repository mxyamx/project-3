import { SocketGameCommunication } from '@app/services/socket-game-communication/socket-game-communication.service';
import { CurrentGame } from '@common/current-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { DiceBonus } from '@common/enums/dice-bonus';
import { GameEventType } from '@common/enums/game-event-type';
import { GameMode } from '@common/enums/game-mode';
import { ItemType } from '@common/enums/item-type';
import { TileType } from '@common/enums/tile-type';
import { Player } from '@common/player';
import { Server, Socket } from 'socket.io';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import sinon = require('sinon');
// eslint-disable-next-line @typescript-eslint/no-require-imports
import assert = require('assert');

describe('SocketGameCommunication', () => {
    let communication: SocketGameCommunication;
    let mockSocketServer: Server;
    let mockSocket: Socket;
    let emitStub: sinon.SinonStub;

    let currentGame: CurrentGame;
    let player1: Player;
    let player2: Player;

    beforeEach(() => {
        emitStub = sinon.stub();
        mockSocketServer = {
            send: sinon.stub(),
            to: sinon.stub().returns({ emit: emitStub }),
            on: sinon.stub(),
        } as unknown as Server;

        mockSocket = {
            id: 'socket123',
            on: sinon.stub(),
        } as unknown as Socket;

        communication = new SocketGameCommunication(mockSocketServer);

        const rows = 10;
        const cols = 10;

        player1 = {
            name: 'Player1',
            character: 'Char1',
            attributes: {
                attackValue: 4,
                defenseValue: 4,
                speedValue: 4,
                healthValue: 4,
                bonusAttack: DiceBonus.SixSideBonus,
                bonusDefense: DiceBonus.FourSideBonus,
            },
            organizer: false,
        };
        player2 = {
            name: 'Player2',
            character: 'Char2',
            attributes: {
                attackValue: 4,
                defenseValue: 4,
                speedValue: 4,
                healthValue: 4,
                bonusAttack: DiceBonus.FourSideBonus,
                bonusDefense: DiceBonus.SixSideBonus,
            },
            organizer: false,
        };

        currentGame = {
            id: 'game123',
            players: [player1, player2],
            boardGame: {
                id: 'test',
                name: 'TestBoard',
                description: 'desc',
                size: BoardGameSize.Small,
                gameMode: GameMode.Normal,
                tiles: Array(rows)
                    .fill(null)
                    .map(() =>
                        Array(cols)
                            .fill(null)
                            .map(() => ({
                                type: TileType.Grass,
                            })),
                    ),
                previewImage: '',
                visibility: true,
                itemInfos: [],
                lastModified: new Date(),
            },
            locked: false,
        };

        currentGame.boardGame.tiles[0][0].containedItem = {
            name: 'start1',
            type: ItemType.StartingPoint,
            description: '',
            disabled: false,
        };
    });

    it('should emit message-sent to the correct room on room-message', () => {
        const messageData = {
            gameId: 'game123',
            message: { sender: 'Player1', text: 'Hello world', timestamp: new Date() },
        };
        communication['rooms'].set('game123', new Set(['socket123']));
        communication.handleSockets(mockSocket);
        const onStub = mockSocket.on as sinon.SinonStub;
        const roomMessageCallback = onStub.withArgs('room-message').args[0][1];

        roomMessageCallback(messageData);

        sinon.assert.calledOnceWithExactly(mockSocketServer.to as sinon.SinonStub, 'game123');
        sinon.assert.calledWith(emitStub, 'message-sent', messageData.message);
    });

    it('should receive the message to the correct room on room-message', () => {
        const messageData = {
            gameId: 'game123',
            message: { sender: 'Player1', text: 'Hello world', timestamp: new Date() },
        };
        communication['rooms'].set('game123', new Set(['socket123']));
        communication.handleSockets(mockSocket);
        const onStub = mockSocket.on as sinon.SinonStub;
        const roomMessageCallback = onStub.withArgs('room-message').args[0][1];

        roomMessageCallback(messageData);

        sinon.assert.calledOnceWithExactly(mockSocketServer.to as sinon.SinonStub, 'game123');
        sinon.assert.calledWith(emitStub, 'message-sent', messageData.message);
    });

    it('should add socket to room and join it on join-room-chat', () => {
        const joinStub = sinon.stub();
        mockSocket.join = joinStub;

        communication.handleSockets(mockSocket);

        const onStub = mockSocket.on as sinon.SinonStub;
        const joinRoomCallback = onStub.withArgs('join-room-chat').args[0][1];

        joinRoomCallback('game123');

        const room = communication['rooms'].get('game123');
        assert.ok(room, 'Room should be created');
        assert.strictEqual(room?.has('socket123'), true, 'Socket should be added to the room');
        sinon.assert.calledWith(joinStub, 'game123');
    });

    it('should add socket to room and join it on join-room-log', () => {
        const joinStub = sinon.stub();
        mockSocket.join = joinStub;

        communication.handleSockets(mockSocket);

        const onStub = mockSocket.on as sinon.SinonStub;
        const joinRoomCallback = onStub.withArgs('join-room-log').args[0][1];

        joinRoomCallback('game123');

        const room = communication['rooms'].get('game123');
        assert.ok(room, 'Room should be created');
        assert.strictEqual(room?.has('socket123'), true, 'Socket should be added to the room');
        sinon.assert.calledWith(joinStub, 'game123');
    });

    it('should add socket to room and join it on join-combat-log', () => {
        const gameId = 'game123';
        const joinStub = sinon.stub();
        mockSocket.join = joinStub;

        communication.handleSockets(mockSocket);

        const onStub = mockSocket.on as sinon.SinonStub;
        const joinRoomCallback = onStub.withArgs('join-combat-log').args[0][1];
        joinRoomCallback({ gameId });
        const gameIdCombat = gameId + '-combat';
        const room = communication['rooms'].get(gameIdCombat);
        assert.ok(room, 'Room should be created');
        assert.strictEqual(room?.has('socket123'), true, 'Socket should be added to the room');
        sinon.assert.calledWith(joinStub, gameIdCombat);
    });

    it('should receive log to the correct room on change-turn-log', () => {
        const messageData = {
            gameId: 'game123',
            gameEvent: { type: 'SOME_EVENT', content: 'Something happened' },
        };

        communication['rooms'].set('game123', new Set(['socket123']));
        communication.handleSockets(mockSocket);

        const onStub = mockSocket.on as sinon.SinonStub;
        const roomMessageCallback = onStub.withArgs('change-turn-log').args[0][1];

        roomMessageCallback(messageData);

        sinon.assert.calledOnceWithExactly(mockSocketServer.to as sinon.SinonStub, 'game123');
        sinon.assert.calledWith(emitStub, 'change-turn-log-sent', messageData.gameEvent);
    });

    it('should emit combat-log-sent to the correct room on combat-log', () => {
        const messageData = {
            gameId: 'game123',
            gameEvent: { message: 'Hello world', timestamp: new Date(), type: GameEventType.Escape, player: 'Player1' },
        };
        communication['rooms'].set('game123-combat', new Set(['socket123']));
        communication.handleSockets(mockSocket);
        const onStub = mockSocket.on as sinon.SinonStub;
        const roomMessageCallback = onStub.withArgs('combat-log').args[0][1];

        roomMessageCallback(messageData);

        sinon.assert.calledOnceWithExactly(mockSocketServer.to as sinon.SinonStub, 'game123-combat');
        sinon.assert.calledWith(emitStub, 'combat-log-sent', messageData.gameEvent);
    });

    it('should add socket to an existing combat room on combat-log', () => {
        const joinStub = sinon.stub();
        mockSocket.join = joinStub;

        const gameId = 'game123';
        const combatRoomId = gameId + '-combat';

        communication['rooms'].set(combatRoomId, new Set());

        communication.handleSockets(mockSocket);
        const onStub = mockSocket.on as sinon.SinonStub;
        const joinRoomCallback = onStub.withArgs('join-combat-log').args[0][1];

        joinRoomCallback({ gameId });

        const room = communication['rooms'].get(combatRoomId);
        assert.ok(room, 'Room should still exist');
        assert.strictEqual(room?.has('socket123'), true, 'Socket should be added to the existing room');
        sinon.assert.calledWith(joinStub, combatRoomId);
    });

    it('should add socket to an existing combat room on join-room-chat', () => {
        const joinStub = sinon.stub();
        mockSocket.join = joinStub;

        const gameId = 'game123';

        communication['rooms'].set(gameId, new Set());

        communication.handleSockets(mockSocket);
        const onStub = mockSocket.on as sinon.SinonStub;
        const joinRoomCallback = onStub.withArgs('join-room-chat').args[0][1];

        joinRoomCallback(gameId);

        const room = communication['rooms'].get(gameId);
        assert.ok(room, 'Room should still exist');
        assert.strictEqual(room?.has('socket123'), true, 'Socket should be added to the existing room');
        sinon.assert.calledWith(joinStub, gameId);
    });

    it('should add socket to an existing combat room on join-room-log', () => {
        const joinStub = sinon.stub();
        mockSocket.join = joinStub;

        const gameId = 'game123';

        communication['rooms'].set(gameId, new Set());

        communication.handleSockets(mockSocket);
        const onStub = mockSocket.on as sinon.SinonStub;
        const joinRoomCallback = onStub.withArgs('join-room-log').args[0][1];

        joinRoomCallback(gameId);

        const room = communication['rooms'].get(gameId);
        assert.ok(room, 'Room should still exist');
        assert.strictEqual(room?.has('socket123'), true, 'Socket should be added to the existing room');
        sinon.assert.calledWith(joinStub, gameId);
    });

    it('should add socket to an existing combat room on join-combat-log', () => {
        const joinStub = sinon.stub();
        mockSocket.join = joinStub;

        const gameId = 'game123';
        const combatRoomId = gameId + '-combat';

        communication['rooms'].set(combatRoomId, new Set());

        communication.handleSockets(mockSocket);
        const onStub = mockSocket.on as sinon.SinonStub;
        const joinRoomCallback = onStub.withArgs('join-combat-log').args[0][1];

        joinRoomCallback({ gameId });

        const room = communication['rooms'].get(combatRoomId);
        assert.ok(room, 'Room should still exist');
        assert.strictEqual(room?.has('socket123'), true, 'Socket should be added to the existing room');
        sinon.assert.calledWith(joinStub, combatRoomId);
    });

    it('should handle case where room is deleted between has and get in join-room-chat', () => {
        const joinStub = sinon.stub();
        mockSocket.join = joinStub;
        const originalGet = communication['rooms'].get;
        communication['rooms'].get = () => undefined;

        communication.handleSockets(mockSocket);
        const onStub = mockSocket.on as sinon.SinonStub;
        const joinRoomCallback = onStub.withArgs('join-room-chat').args[0][1];
        joinRoomCallback('game123');

        sinon.assert.calledWith(joinStub, 'game123');
        communication['rooms'].get = originalGet;
    });

    it('should handle case where room is deleted between has and get in join-room-log', () => {
        const joinStub = sinon.stub();
        mockSocket.join = joinStub;
        const originalGet = communication['rooms'].get;
        communication['rooms'].get = () => undefined;

        communication.handleSockets(mockSocket);
        const onStub = mockSocket.on as sinon.SinonStub;
        const joinRoomCallback = onStub.withArgs('join-room-log').args[0][1];
        joinRoomCallback('game123');

        sinon.assert.calledWith(joinStub, 'game123');
        communication['rooms'].get = originalGet;
    });

    it('should handle case where room is deleted between has and get in join-combat-log', () => {
        const joinStub = sinon.stub();
        mockSocket.join = joinStub;
        const originalGet = communication['rooms'].get;
        communication['rooms'].get = () => undefined;

        communication.handleSockets(mockSocket);
        const onStub = mockSocket.on as sinon.SinonStub;
        const joinRoomCallback = onStub.withArgs('join-combat-log').args[0][1];

        joinRoomCallback({ gameId: 'game123' });

        sinon.assert.calledWith(joinStub, 'game123-combat');
        communication['rooms'].get = originalGet;
    });
});

/* eslint-disable max-lines */
import { VirtualPlayerManager } from '@app/classes/virtual-player-manager/virtual-player-manager';
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { CurrentGamesService } from '@app/services/current-games/current-games.service';
import { BoardGame } from '@common/board-game';
import { CurrentGame } from '@common/current-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { DiceBonus } from '@common/enums/dice-bonus';
import { GameMode } from '@common/enums/game-mode';
import { ItemType } from '@common/enums/item-type';
import { TileType } from '@common/enums/tile-type';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import { Player } from '@common/player';
import { VirtualPlayer } from '@common/virtual-player';
import { Server } from 'app/server';
import { assert } from 'chai';
import * as sinon from 'sinon';
import { io as ioClient, Socket } from 'socket.io-client';
import { Container } from 'typedi';
import { SocketManager } from './socket-manager.service';
const RESPONSE_DELAY = 800;

describe('SocketManager service tests', () => {
    let sandbox: sinon.SinonSandbox;
    let service: SocketManager;
    let server: Server;
    let clientSocket: Socket;
    let stubbedCurrentGamesService: sinon.SinonStubbedInstance<CurrentGamesService>;
    let testBoard: BoardGame;
    let unlockedTestGame: CurrentGame;
    let lockedTestGame: CurrentGame;
    let testPlayer: Player;
    let testPlayerToRemove: Player;
    let toSpy: sinon.SinonSpy;
    let testVirtualPlayer: VirtualPlayer;

    const urlString = 'http://localhost:3000';

    beforeEach(async () => {
        sandbox = sinon.createSandbox();

        stubbedCurrentGamesService = sandbox.createStubInstance(CurrentGamesService);

        Container.set(CurrentGamesService, stubbedCurrentGamesService);
        server = Container.get(Server);
        await server.init();
        service = server['socketManager'];

        service['vpManagers'] = new Map<string, VirtualPlayerManager>();
        service['vpSockets'] = new Map<string, VpSocketManager>();

        toSpy = sandbox.spy(service['sio'], 'to');

        clientSocket = ioClient(urlString);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).gameScheduler.joinGame = () => {
            return;
        };

        const rows = 10;
        const cols = 10;
        testBoard = {
            id: '1234',
            name: 'board name',
            description: 'A fun and exciting test game!',
            size: BoardGameSize.Small,
            gameMode: GameMode.Normal,
            tiles: Array(rows)
                .fill(null)
                .map(() =>
                    Array(cols)
                        .fill(null)
                        .map(() => ({ type: TileType.Grass })),
                ),
            previewImage: 'url_to_preview_image',
            visibility: true,
            itemInfos: [
                {
                    item: {
                        name: 'Entry Point',
                        type: ItemType.StartingPoint,
                        description: 'The starting point for the game',
                    },
                    available: 0,
                },
            ],
            lastModified: new Date(),
        };

        testPlayer = {
            name: 'Default Player',
            character: 'character.png',
            attributes: {
                attackValue: 5,
                defenseValue: 5,
                speedValue: 5,
                healthValue: 6,
                bonusAttack: DiceBonus.FourSideBonus,
                bonusDefense: DiceBonus.SixSideBonus,
            },
            organizer: true,
            virtualPlayer: false,
            victories: 0,
        };

        testPlayerToRemove = {
            name: 'Default Player 2',
            character: 'character.png',
            attributes: {
                attackValue: 5,
                defenseValue: 5,
                speedValue: 5,
                healthValue: 6,
                bonusAttack: DiceBonus.FourSideBonus,
                bonusDefense: DiceBonus.SixSideBonus,
            },
            organizer: true,
            virtualPlayer: false,
            victories: 0,
        };

        testVirtualPlayer = {
            name: 'Default Player',
            character: 'character.png',
            attributes: {
                attackValue: 5,
                defenseValue: 5,
                speedValue: 5,
                healthValue: 6,
                bonusAttack: DiceBonus.FourSideBonus,
                bonusDefense: DiceBonus.SixSideBonus,
            },
            organizer: false,
            virtualPlayer: true,
            victories: 0,
            profile: VirtualPlayerProfile.Agressive,
            socketId: 'vp-socket-id',
        };

        unlockedTestGame = {
            id: '1234',
            players: [testPlayer, testPlayerToRemove],
            boardGame: testBoard,
            locked: false,
            adminId: '',
        };

        lockedTestGame = {
            id: '4321',
            players: [testPlayer],
            boardGame: testBoard,
            locked: true,
            adminId: '',
            started: true,
        };
    });

    afterEach(() => {
        clientSocket.close();
        service['sio'].close();
        sandbox.restore();
    });

    it('should create a game and join the socket to the game room', (done) => {
        const testGame: CurrentGame = {
            ...unlockedTestGame,
            adminId: clientSocket.id,
        };

        stubbedCurrentGamesService.createGame.resolves(testGame);

        clientSocket.emit('create-game', testGame, (createdGame: CurrentGame) => {
            testGame.adminId = createdGame.adminId;
            testGame.boardGame.lastModified = createdGame.boardGame.lastModified;
            assert.deepEqual(createdGame, JSON.parse(JSON.stringify(testGame)));
            sinon.assert.calledWith(stubbedCurrentGamesService.createGame, testGame);
            done();
        });
    });

    it('should toggle the lock status of a game', (done) => {
        const gameId = '1234';

        stubbedCurrentGamesService.getGame.resolves(unlockedTestGame);
        stubbedCurrentGamesService.updateGame.resolves();

        clientSocket.emit('toggle-lock', gameId, (isLocked: boolean) => {
            assert.isTrue(isLocked);
            assert.isTrue(stubbedCurrentGamesService.getGame.calledWith(gameId));
            assert.isTrue(stubbedCurrentGamesService.updateGame.calledWith(unlockedTestGame));
            assert.isTrue(toSpy.calledWith(gameId));
            done();
        });
    });

    it('should return false if toggle lock and game not found', (done) => {
        const gameId = '0000';

        stubbedCurrentGamesService.getGame.resolves(null);

        clientSocket.emit('toggle-lock', gameId, (isLocked: boolean) => {
            assert.isFalse(isLocked);
            assert.isTrue(stubbedCurrentGamesService.getGame.calledWith(gameId));
            assert.isFalse(stubbedCurrentGamesService.updateGame.called);
            done();
        });
    });

    it('should retrieve a game', (done) => {
        const gameId = '1234';
        const testGame: CurrentGame = unlockedTestGame;

        stubbedCurrentGamesService.getGame.resolves(testGame);

        clientSocket.emit('get-game', gameId, (game: CurrentGame) => {
            testGame.adminId = game.adminId;
            testGame.boardGame.lastModified = game.boardGame.lastModified;
            assert.deepEqual(game, JSON.parse(JSON.stringify(testGame)));
            assert.isTrue(stubbedCurrentGamesService.getGame.calledWith(gameId));
            done();
        });
    });

    it('should return null if game is not found', (done) => {
        const gameId = '0000';

        stubbedCurrentGamesService.getGame.resolves(null);
        clientSocket.emit('get-game', gameId, (game: CurrentGame) => {
            assert.deepEqual(game, null);
            done();
        });
    });

    it('should delete a game', (done) => {
        const gameId = '1234';

        stubbedCurrentGamesService.deleteGame.resolves();

        clientSocket.emit('delete-game', gameId);
        setTimeout(() => {
            assert.isTrue(stubbedCurrentGamesService.deleteGame.calledWith(gameId));
            done();
        }, RESPONSE_DELAY);
    });

    it('should handle avatar selection', (done) => {
        const gameId = '1234';
        const avatar = 'avatar1';

        clientSocket.emit('avatar-selection', { gameId, avatar }, (avatars: string[]) => {
            assert.deepEqual(avatars, [avatar]);
            done();
        });
    });

    it('should not add an avatar if it is already selected', (done) => {
        const gameId = '1234';
        const avatar = 'avatar1';

        service['games'][gameId] = new Set([avatar]);

        const addSpy = sinon.spy(service['games'][gameId], 'add');

        clientSocket.emit('avatar-selection', { gameId, avatar }, () => {
            setTimeout(() => {
                sinon.assert.notCalled(addSpy);

                done();
            }, RESPONSE_DELAY);
        });
    });

    it('should handle avatar deselection', (done) => {
        const gameId = '1234';
        const avatar = 'avatar1';

        clientSocket.emit('avatar-selection', { gameId, avatar }, () => {
            clientSocket.emit('avatar-deselection', { gameId, avatar }, (avatars: string[]) => {
                assert.deepEqual(avatars, []);
                done();
            });
        });
    });

    it('should return selected avatars', (done) => {
        const gameId = '1234';
        const avatar = 'avatar1';

        clientSocket.emit('avatar-selection', { gameId, avatar }, () => {
            clientSocket.emit('get-selected-avatars', gameId, (avatars: string[]) => {
                assert.deepEqual(avatars, [avatar]);
                done();
            });
        });
    });

    it('should return an empty array if the game ID does not exist', (done) => {
        const gameId = 'mock-id';

        clientSocket.emit('get-selected-avatars', gameId, (avatars: string[]) => {
            assert.deepEqual(avatars, []);

            done();
        });
    });

    it('should join a room if the game exists', (done) => {
        const gameId = '1234';

        stubbedCurrentGamesService.getGame.resolves(unlockedTestGame);

        clientSocket.emit('join-room', gameId);

        setTimeout(() => {
            assert.isTrue(toSpy.calledWith(gameId));

            sinon.assert.calledWith(toSpy, gameId);

            done();
        }, RESPONSE_DELAY);
    });

    it('should start a game', (done) => {
        const gameId = '1234';

        stubbedCurrentGamesService.getGame.resolves(unlockedTestGame);

        clientSocket.emit('start-game', gameId);

        setTimeout(() => {
            assert.isTrue(stubbedCurrentGamesService.getGame.calledWith(gameId));
            done();
        }, RESPONSE_DELAY);
    });

    it('should handle admin leaving the game', (done) => {
        const gameId = '1234';

        unlockedTestGame.players = [testPlayer, testPlayerToRemove, testVirtualPlayer];
        stubbedCurrentGamesService.getGame.resolves(unlockedTestGame);
        stubbedCurrentGamesService.removePlayer.resolves();
        stubbedCurrentGamesService.deleteGame.resolves();
        service['games'][gameId] = new Set([testPlayer.character, testPlayerToRemove.character]);

        clientSocket.emit('admin-leaving', gameId);

        setTimeout(() => {
            assert.isTrue(stubbedCurrentGamesService.getGame.calledWith(gameId));
            sinon.assert.calledWith(stubbedCurrentGamesService.removePlayer, testPlayer, gameId);
            sinon.assert.calledWith(stubbedCurrentGamesService.removePlayer, testPlayerToRemove, gameId);
            done();
        }, RESPONSE_DELAY);
    });

    it('should not proceed to handle admin leaving if game not found', (done) => {
        const gameId = 'test-id';

        stubbedCurrentGamesService.getGame.resolves(null);
        clientSocket.emit('admin-leaving', gameId);

        setTimeout(() => {
            assert.isTrue(stubbedCurrentGamesService.getGame.calledWith(gameId));
            assert.isFalse(stubbedCurrentGamesService.deleteGame.called);
            done();
        }, RESPONSE_DELAY);
    });

    it('should handle a player leaving the game', (done) => {
        const gameId = '1234';
        const player: Player = testPlayer;

        stubbedCurrentGamesService.getGame.resolves(unlockedTestGame);
        stubbedCurrentGamesService.removePlayer.resolves();

        clientSocket.emit('leave-game', { gameId, player });

        setTimeout(() => {
            assert.isTrue(stubbedCurrentGamesService.getGame.calledWith(gameId));
            assert.isTrue(stubbedCurrentGamesService.removePlayer.calledWith(player, gameId));
            done();
        }, RESPONSE_DELAY);
    });

    it('should emit admin-left and admin-leaving events when admin leaves the game', (done) => {
        const gameId = '1234';
        const player: Player = { ...testPlayer, socketId: clientSocket.id };

        unlockedTestGame.adminId = clientSocket.id;
        stubbedCurrentGamesService.getGame.resolves(unlockedTestGame);
        stubbedCurrentGamesService.removePlayer.resolves();

        clientSocket.emit('leave-game', { gameId, player });
        setTimeout(() => {
            assert.isTrue(toSpy.calledWith(gameId));
            sinon.assert.calledWith(toSpy, gameId);
            done();
        }, RESPONSE_DELAY);
    });

    it('should disconnect the player socket if it exists', (done) => {
        const gameId = '1234';
        const player: Player = { ...testPlayer, socketId: clientSocket.id };

        stubbedCurrentGamesService.getGame.resolves(unlockedTestGame);
        stubbedCurrentGamesService.removePlayer.resolves();

        clientSocket.emit('leave-game', { gameId, player });
        setTimeout(() => {
            const playerSocket = service['sio'].sockets.sockets.get(player.socketId);
            assert.isUndefined(playerSocket);
            done();
        }, RESPONSE_DELAY);
    });

    it('should emit admin-left event when the admin leaves the game', (done) => {
        const gameId = '1234';

        clientSocket = ioClient(urlString);

        clientSocket.on('connect', () => {
            const player: Player = {
                ...testPlayer,
                socketId: clientSocket.id,
            };

            const updatedGame = {
                ...unlockedTestGame,
                adminId: clientSocket.id,
            };

            stubbedCurrentGamesService.getGame.resolves(updatedGame);
            stubbedCurrentGamesService.removePlayer.resolves();

            clientSocket.emit('leave-game', { gameId, player });
            setTimeout(() => {
                assert.isFalse(stubbedCurrentGamesService.deleteGame.called);
                done();
            }, RESPONSE_DELAY);
        });
    });

    it('should emit lock-updated event when the game is unlocked', (done) => {
        const gameId = '1234';
        const player: Player = { ...testPlayer, socketId: clientSocket.id };

        unlockedTestGame.players = [player];
        unlockedTestGame.locked = true;
        stubbedCurrentGamesService.getGame.resolves(unlockedTestGame);
        stubbedCurrentGamesService.removePlayer.resolves();
        stubbedCurrentGamesService.updateGame.resolves();

        clientSocket.emit('leave-game', { gameId, player });
        setTimeout(() => {
            assert.isTrue(toSpy.calledWith(gameId));
            sinon.assert.calledWith(toSpy, gameId);
            done();
        }, RESPONSE_DELAY);
    });

    it('should delete player character and emit avatar-list-updated if games[gameId] exists when player leaves', (done) => {
        const gameId = '1234';
        const player: Player = testPlayer;

        stubbedCurrentGamesService.getGame.resolves(unlockedTestGame);
        stubbedCurrentGamesService.removePlayer.resolves();

        const mockGames = new Map();
        mockGames.set(player.character, player);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).games = { [gameId]: mockGames };

        clientSocket.emit('leave-game', { gameId, player });

        setTimeout(() => {
            assert.isTrue(stubbedCurrentGamesService.getGame.calledWith(gameId));
            assert.isTrue(stubbedCurrentGamesService.removePlayer.calledWith(player, gameId));
            assert.isTrue(mockGames.has(player.character) === false);
            done();
        }, RESPONSE_DELAY);
    });

    it('should handle kicking a player', (done) => {
        const gameId = '1234';
        const player: Player = testPlayer;

        stubbedCurrentGamesService.getGame.resolves(unlockedTestGame);
        stubbedCurrentGamesService.removePlayer.resolves();

        clientSocket.emit('kick-player', { gameId, player });

        setTimeout(() => {
            assert.isTrue(stubbedCurrentGamesService.getGame.calledWith(gameId));
            assert.isTrue(stubbedCurrentGamesService.removePlayer.calledWith(player, gameId));
            done();
        }, RESPONSE_DELAY);
    });

    it('should delete player character and emit avatar-list-updated if games[gameId] exists when kicked', (done) => {
        const gameId = '1234';
        const player: Player = testPlayer;

        stubbedCurrentGamesService.getGame.resolves(unlockedTestGame);
        stubbedCurrentGamesService.removePlayer.resolves();

        service['games'][gameId] = new Set([player.character]);

        clientSocket.emit('kick-player', { gameId, player });
        setTimeout(() => {
            assert.isFalse(service['games'][gameId].has(player.character));
            sinon.assert.calledWith(toSpy, gameId);
            done();
        }, RESPONSE_DELAY);
    });

    it('should unlock the game and emit lock-updated if players fall below max limit', (done) => {
        const gameId = '1234';
        const player: Player = testPlayer;

        unlockedTestGame.players = [player];
        unlockedTestGame.locked = true;
        stubbedCurrentGamesService.getGame.resolves(unlockedTestGame);
        stubbedCurrentGamesService.removePlayer.resolves();
        stubbedCurrentGamesService.updateGame.resolves();

        clientSocket.emit('kick-player', { gameId, player });
        setTimeout(() => {
            assert.isFalse(unlockedTestGame.locked);
            sinon.assert.calledWith(toSpy, gameId);
            done();
        }, RESPONSE_DELAY);
    });

    it('should add a player to the game and emit player-joined', (done) => {
        const gameId = unlockedTestGame.id;
        const player: Player = testPlayer;

        stubbedCurrentGamesService.getGame.resolves(unlockedTestGame);
        stubbedCurrentGamesService.addPlayer.resolves();

        clientSocket.emit('join-game', { gameId, player });

        setTimeout(() => {
            assert.isTrue(stubbedCurrentGamesService.getGame.calledWith(gameId));
            assert.isTrue(stubbedCurrentGamesService.addPlayer.calledWith({ ...player, socketId: clientSocket.id }, gameId));

            const roomSize = service['sio'].sockets.adapter.rooms.get(gameId)?.size;
            assert.equal(roomSize, 1);
            done();
        }, RESPONSE_DELAY);
    });

    it('should not proceed if the game is not found', (done) => {
        const gameId = 'test-id';
        const player: Player = testPlayer;

        stubbedCurrentGamesService.getGame.resolves(null);

        clientSocket.emit('join-game', { gameId, player });

        setTimeout(() => {
            assert.isTrue(stubbedCurrentGamesService.getGame.calledWith(gameId));
            assert.isFalse(stubbedCurrentGamesService.addPlayer.called);
            done();
        }, RESPONSE_DELAY);
    });

    it('should handle admin disconnection and delete the game', (done) => {
        clientSocket.on('connect', () => {
            const adminSocketId = clientSocket.id;

            const updatedGame: CurrentGame = {
                ...unlockedTestGame,
                adminId: adminSocketId,
            };

            stubbedCurrentGamesService.getAllGames.resolves([updatedGame]);
            stubbedCurrentGamesService.deleteGame.resolves();

            clientSocket.disconnect();

            setTimeout(() => {
                assert.isTrue(stubbedCurrentGamesService.deleteGame.calledWith(updatedGame.id));

                sinon.assert.calledWith(toSpy, updatedGame.id);

                done();
            }, RESPONSE_DELAY);
        });
    });

    it('should handle player disconnection and emit player-left event', (done) => {
        clientSocket.on('connect', () => {
            const playerSocketId = clientSocket.id;

            const player: Player = {
                ...testPlayer,
                socketId: playerSocketId,
            };

            const updatedGame: CurrentGame = {
                ...unlockedTestGame,
                players: [player],
            };

            stubbedCurrentGamesService.getAllGames.resolves([updatedGame]);
            clientSocket.disconnect();

            setTimeout(() => {
                sinon.assert.calledWith(toSpy, updatedGame.id);

                done();
            }, RESPONSE_DELAY);
        });
    });

    it('should update the game start status when update-game-start event is emitted', (done) => {
        const gameId = '1234';
        const updatedGame: CurrentGame = {
            ...unlockedTestGame,
            started: false,
        };

        stubbedCurrentGamesService.getGame.resolves(updatedGame);
        stubbedCurrentGamesService.updateGame.resolves();

        clientSocket.emit('update-game-start', gameId);

        setTimeout(() => {
            assert.isTrue(updatedGame.started);
            sinon.assert.calledWith(stubbedCurrentGamesService.getGame, gameId);
            sinon.assert.calledWith(stubbedCurrentGamesService.updateGame, updatedGame);
            done();
        }, RESPONSE_DELAY);
    });

    it('should update avatar list when player disconnects', (done) => {
        clientSocket.on('connect', () => {
            const playerSocketId = clientSocket.id;
            const gameId = '1234';

            const player = {
                ...testPlayer,
                socketId: playerSocketId,
                character: 'test-character.png',
            };

            const game = {
                ...unlockedTestGame,
                id: gameId,
                players: [player],
            };
            service['games'][gameId] = new Set([player.character]);

            stubbedCurrentGamesService.getAllGames.resolves([game]);
            clientSocket.disconnect();

            setTimeout(() => {
                sinon.assert.called(stubbedCurrentGamesService.getAllGames);
                assert.equal(service['games'][gameId].size, 0);
                sinon.assert.calledWith(stubbedCurrentGamesService.removePlayer, player, gameId);
                sinon.assert.calledWith(toSpy, gameId);
                done();
            }, RESPONSE_DELAY);
        });
    });

    it('should cleanup virtual player resources when kicking player', (done) => {
        const gameId = '1234';
        const vpPlayer = {
            ...testVirtualPlayer,
            socketId: 'vp-socket-id',
        };

        const mockVpManager = {
            releaseVpName: sandbox.stub(),
        } as unknown as VirtualPlayerManager;

        const mockVpSocket = {
            clientSocket: {
                disconnect: sandbox.stub(),
            },
        } as unknown as VpSocketManager;

        service['vpManagers'].set(gameId, mockVpManager);
        service['vpSockets'].set(vpPlayer.socketId, mockVpSocket);

        unlockedTestGame.players = [vpPlayer];
        stubbedCurrentGamesService.getGame.resolves(unlockedTestGame);
        stubbedCurrentGamesService.removePlayer.resolves();

        clientSocket.emit('kick-player', { gameId, player: vpPlayer });

        setTimeout(() => {
            assert.isFalse(service['vpSockets'].has(vpPlayer.socketId));
            done();
        }, RESPONSE_DELAY);
    });

    it('should cleanup all virtual player resources when admin leaves', (done) => {
        const gameId = '1234';
        const vpPlayer = {
            ...testVirtualPlayer,
            socketId: 'vp-socket-id',
        };
        const mockVpManager = {
            releaseVpName: sandbox.stub(),
        } as unknown as VirtualPlayerManager;

        const mockVpSocket = {
            clientSocket: {
                disconnect: sandbox.stub(),
            },
        } as unknown as VpSocketManager;

        service['vpManagers'].set(gameId, mockVpManager);
        service['vpSockets'].set(vpPlayer.socketId, mockVpSocket);
        service['games'][gameId] = new Set([vpPlayer.character]);

        unlockedTestGame.players = [vpPlayer];
        unlockedTestGame.adminId = clientSocket.id;
        stubbedCurrentGamesService.getGame.resolves(unlockedTestGame);
        stubbedCurrentGamesService.removePlayer.resolves();
        stubbedCurrentGamesService.deleteGame.resolves();

        clientSocket.emit('admin-leaving', gameId);

        setTimeout(() => {
            sinon.assert.calledWith(stubbedCurrentGamesService.removePlayer, vpPlayer, gameId);
            sinon.assert.calledWith(stubbedCurrentGamesService.deleteGame, gameId);
            done();
        }, RESPONSE_DELAY);
    });

    it('should return early if game not found when leaving', (done) => {
        const gameId = 'non-existent-game';
        const player = testPlayer;

        stubbedCurrentGamesService.getGame.resolves(null);

        clientSocket.emit('leave-game', { gameId, player });

        setTimeout(() => {
            sinon.assert.calledOnce(stubbedCurrentGamesService.getGame);
            sinon.assert.calledWith(stubbedCurrentGamesService.getGame, gameId);
            done();
        }, RESPONSE_DELAY);
    });

    it('should cleanup virtual player when leaving game', (done) => {
        const gameId = '1234';
        const vpPlayer = {
            ...testVirtualPlayer,
            socketId: 'vp-socket-id',
        };
        const mockVpManager = {
            releaseVpName: sandbox.stub(),
        } as unknown as VirtualPlayerManager;

        service['vpManagers'].set(gameId, mockVpManager);
        service['games'][gameId] = new Set([vpPlayer.character]);
        unlockedTestGame.players = [vpPlayer];
        stubbedCurrentGamesService.getGame.resolves(unlockedTestGame);
        stubbedCurrentGamesService.removePlayer.resolves();

        clientSocket.emit('leave-game', { gameId, player: vpPlayer });

        setTimeout(() => {
            assert.isFalse(service['games'][gameId].has(vpPlayer.character));
            done();
        }, RESPONSE_DELAY);
    });

    it('should cleanup when only virtual players remain after disconnect', (done) => {
        clientSocket.on('connect', () => {
            const playerSocketId = clientSocket.id;
            const gameId = '4321';

            const player = {
                ...testPlayer,
                socketId: playerSocketId,
                character: 'test-character.png',
                virtualPlayer: false,
            };

            const vpPlayer = {
                ...testVirtualPlayer,
                virtualPlayer: true,
                socketId: 'vp-socket-id',
            };

            const initialGame = {
                ...lockedTestGame,
                id: gameId,
                players: [player, vpPlayer],
                started: true,
                adminId: 'different-admin-id',
            };

            stubbedCurrentGamesService.getAllGames.resolves([initialGame]);

            const gameAfterPlayerRemoval = {
                ...initialGame,
                players: [vpPlayer],
            };
            const mockVpSocket = {
                clientSocket: {
                    removeAllListeners: sandbox.stub(),
                    disconnect: sandbox.stub(),
                },
            } as unknown as VpSocketManager;

            service['vpSockets'].set(vpPlayer.socketId, mockVpSocket);
            service['vpManagers'].set(gameId, new VirtualPlayerManager());
            service['games'][gameId] = new Set([player.character, vpPlayer.character]);

            if (!service['gameScheduler']['gameMap']) {
                service['gameScheduler']['gameMap'] = new Map();
            }
            clientSocket.disconnect();

            const mockGameController = {
                endGame: sandbox.stub(),
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (service as any)['gameScheduler']['gameMap'].set(gameId, mockGameController);

            stubbedCurrentGamesService.getGame.resolves(gameAfterPlayerRemoval);
            stubbedCurrentGamesService.removePlayer.resolves();

            setTimeout(() => {
                assert.isFalse(service['vpManagers'].has(gameId));
                assert.isFalse(service['gameScheduler']['gameMap'].has(gameId));
                done();
            }, RESPONSE_DELAY);
        });
    });
});

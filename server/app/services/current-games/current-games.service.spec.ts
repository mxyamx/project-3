import { CurrentGamesService } from '@app/services/current-games/current-games.service';
import { DatabaseServiceMock } from '@app/services/database/database.service.mock';
import { BoardGame } from '@common/board-game';
import { CurrentGame } from '@common/current-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { DiceBonus } from '@common/enums/dice-bonus';
import { GameMode } from '@common/enums/game-mode';
import { ItemType } from '@common/enums/item-type';
import { TileType } from '@common/enums/tile-type';
import { Player } from '@common/player';
import { assert } from 'chai';
import { MongoClient } from 'mongodb';

const COLLECTION_SIZE_AFTER_CREATION = 3;
describe('CurrentGame Service', () => {
    let currentGamesService: CurrentGamesService;
    let databaseService: DatabaseServiceMock;
    let client: MongoClient;
    let testBoard: BoardGame;
    let lockedTestGame: CurrentGame;
    let unlockedTestGame: CurrentGame;
    let testPlayer: Player;

    beforeEach(async () => {
        databaseService = new DatabaseServiceMock();
        client = (await databaseService.start()) as MongoClient;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currentGamesService = new CurrentGamesService(databaseService as any);
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

        unlockedTestGame = {
            id: '1234',
            players: [testPlayer],
            boardGame: testBoard,
            locked: false,
        };

        await currentGamesService.collection.insertOne(unlockedTestGame);
        lockedTestGame = {
            id: '2345',
            players: [testPlayer],
            boardGame: testBoard,
            locked: true,
        };
        await currentGamesService.collection.insertOne(lockedTestGame);
    });

    afterEach(async () => {
        await databaseService.closeConnection();
    });

    it('should get the correct collection', async () => {
        const games = await currentGamesService.getAllGames();
        assert.equal(games.length, 2);
        assert.deepEqual(unlockedTestGame, games[0]);
    });

    it('should throw an error if we try to get all current games on a closed connection', async () => {
        await client.close();
        try {
            await currentGamesService.getAllGames();
            assert.fail('Expected an error to be thrown, but none was thrown');
        } catch (error) {
            assert.instanceOf(error, Error, 'The thrown error should be an instance of Error');
        }
    });

    it('should get specific game', async () => {
        const game = await currentGamesService.getGame('1234');
        assert.deepEqual(game, unlockedTestGame);
    });

    it('should throw an error if the current game is not found', async () => {
        try {
            await currentGamesService.getGame('test-id');
        } catch (error) {
            assert.instanceOf(error, Error);
            assert.equal(error.message, 'Le jeu actuel est introuvable.');
        }
    });

    it('should insert a new game', async () => {
        const newGame: CurrentGame = {
            id: '1234',
            players: [testPlayer],
            boardGame: testBoard,
            locked: false,
        };

        await currentGamesService.createGame(newGame);
        const games = await currentGamesService.collection.find({}).toArray();
        assert.equal(games.length, COLLECTION_SIZE_AFTER_CREATION);
        const insertedGame = games[2];
        assert.ok(insertedGame.id);
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        assert.equal(insertedGame.id.length, 4);
    });

    it('should throw an error when current game is invalid', async () => {
        const invalidGame: CurrentGame = null;
        try {
            await currentGamesService.createGame(invalidGame);
            assert.fail('Expected an error to be thrown but none was thrown');
        } catch (error) {
            assert.match(error.message, /Les données du jeu actuel sont manquantes./);
        }
    });

    it('should modify an existing current game', async () => {
        const newTestPlayer: Player = {
            name: 'new test character',
            character: 'character2.png',
            attributes: {
                attackValue: 5,
                defenseValue: 5,
                speedValue: 5,
                healthValue: 6,
                bonusAttack: DiceBonus.FourSideBonus,
                bonusDefense: DiceBonus.SixSideBonus,
            },
            organizer: false,
            virtualPlayer: false,
            victories: 0,
        };
        const modifiedGame: CurrentGame = {
            id: '1234',
            players: [testPlayer, newTestPlayer],
            boardGame: testBoard,
            locked: false,
        };

        await currentGamesService.updateGame(modifiedGame);
        const games = await currentGamesService.collection.find({}).toArray();
        assert.equal(games.length, 2);
        assert.deepEqual(games.find((x) => x.id === testBoard.id)?.players[1], modifiedGame.players[1]);
    });

    it('should delete an existing game', async () => {
        await currentGamesService.deleteGame('1234');
        const games = await currentGamesService.collection.find({}).toArray();
        assert.equal(games.length, 1);
    });

    it('should throw an error if current game to delete not found', async () => {
        const testId = 'test-id';

        try {
            await currentGamesService.deleteGame(testId);
            assert.fail('Expected an error to be thrown but none was thrown');
        } catch (error) {
            assert.strictEqual(error.message, 'Échec lors de la suppression du jeu actuel.');
        }
    });

    it('should throw an error if current game to update is not found', async () => {
        const nonExistentGame: CurrentGame = {
            ...unlockedTestGame,
            id: 'invalid-id',
        };
        try {
            await currentGamesService.updateGame(nonExistentGame);
            assert.fail('Expected an error to be thrown but none was thrown');
        } catch (error) {
            assert.instanceOf(error, Error);
            assert.strictEqual(error.message, 'Échec lors de la mise à jour du jeu actuel.');
        }
    });

    it('should add a new player to the game', async () => {
        const newTestPlayer: Player = {
            name: 'New Player',
            character: 'character2.png',
            attributes: {
                attackValue: 5,
                defenseValue: 5,
                speedValue: 5,
                healthValue: 6,
                bonusAttack: DiceBonus.FourSideBonus,
                bonusDefense: DiceBonus.SixSideBonus,
            },
            organizer: false,
            virtualPlayer: false,
            victories: 0,
        };

        await currentGamesService.addPlayer(newTestPlayer, '1234');
        const games = await currentGamesService.collection.find({}).toArray();
        assert.equal(games[0].players.length, 2);
        assert.equal(games[0].players[1].name, 'New Player');
    });

    it('should throw an error if trying to add a player to a game that doesnt exist', async () => {
        const newTestPlayer: Player = {
            name: 'Default Player',
            character: 'character2.png',
            attributes: {
                attackValue: 5,
                defenseValue: 5,
                speedValue: 5,
                healthValue: 6,
                bonusAttack: DiceBonus.FourSideBonus,
                bonusDefense: DiceBonus.SixSideBonus,
            },
            organizer: false,
            virtualPlayer: false,
            victories: 0,
        };

        try {
            await currentGamesService.addPlayer(newTestPlayer, 'test');
            assert.fail('Expected an error to be thrown but none was thrown');
        } catch (error) {
            assert.instanceOf(error, Error);
            assert.strictEqual(error.message, 'Le jeu actuel est introuvable.');
        }
    });

    it('should delete a player from the game', async () => {
        await currentGamesService.removePlayer(unlockedTestGame.players[0], '1234');
        const games = await currentGamesService.collection.find({}).toArray();
        assert.equal(games[0].players.length, 0);
    });

    it('should throw an error if trying to delete a player from a game that doesnt exist', async () => {
        try {
            await currentGamesService.removePlayer(unlockedTestGame.players[0], 'test');
            assert.fail('Expected an error to be thrown but none was thrown');
        } catch (error) {
            assert.instanceOf(error, Error);
            assert.strictEqual(error.message, 'Le jeu actuel est introuvable.');
        }
    });
});

import { HttpException } from '@app/classes/http-exception/http.exception';
import { BoardGameService } from '@app/services/board-game/board-game.service';
import { DatabaseServiceMock } from '@app/services/database/database.service.mock';
import { BoardGame } from '@common/board-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { GameMode } from '@common/enums/game-mode';
import { ItemType } from '@common/enums/item-type';
import { TileType } from '@common/enums/tile-type';
import { assert } from 'chai';
import { MongoClient } from 'mongodb';

const COLLECTION_SIZE_AFTER_CREATION = 3;
const BAD_REQUEST = 400;
describe('BoardGame Service', () => {
    let boardGameService: BoardGameService;
    let databaseService: DatabaseServiceMock;
    let client: MongoClient;
    let testBoard: BoardGame;
    let testBoardInvisible: BoardGame;

    beforeEach(async () => {
        databaseService = new DatabaseServiceMock();
        client = (await databaseService.start()) as MongoClient;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        boardGameService = new BoardGameService(databaseService as any);
        const rows = 10;
        const cols = 10;
        testBoard = {
            id: '12345',
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
        await boardGameService.collection.insertOne(testBoard);
        testBoardInvisible = {
            id: '123456',
            name: 'Invisible board name',
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
            visibility: false,
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
        await boardGameService.collection.insertOne(testBoardInvisible);
    });

    afterEach(async () => {
        await databaseService.closeConnection();
    });

    it('should get the correct collection', async () => {
        const boards = await boardGameService.getAllBoards();
        assert.equal(boards.length, 2);
        assert.deepEqual(testBoard, boards[0]);
    });

    it('should throw an error if we try to get all boards on a closed connection', async () => {
        await client.close();
        try {
            await boardGameService.getAllBoards();
            assert.fail('Expected an error to be thrown, but none was thrown');
        } catch (error) {
            assert.instanceOf(error, Error, 'The thrown error should be an instance of Error');
        }
    });

    it('should get specific board', async () => {
        const board = await boardGameService.getBoard('12345');
        assert.deepEqual(board, testBoard);
    });

    it('should throw an error if the board is not found', async () => {
        try {
            await boardGameService.getBoard('test-id');
        } catch (error) {
            assert.instanceOf(error, Error);
            assert.equal(error.message, 'Le jeu est introuvable.');
        }
    });

    it('should throw an error if board name already exists when trying to create a new board', async () => {
        const duplicateBoard = {
            ...testBoard,
            id: '67890',
        };
        try {
            await boardGameService.createBoard(duplicateBoard);
            assert.fail('Expected an error to be thrown but none was thrown');
        } catch (error) {
            assert.instanceOf(error, HttpException);
            assert.strictEqual(error.status, BAD_REQUEST);
            assert.strictEqual(error.message, 'Il existe déjà un jeu avec le même nom: utilisez un nom différent.');
        }
    });

    it('should insert a new board', async () => {
        const rows = 10;
        const cols = 10;
        const newBoard: BoardGame = {
            id: '12',
            name: 'New Board Test',
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
            visibility: true,
            lastModified: new Date(),
        };
        newBoard.tiles[0][0] = { type: TileType.Grass };
        newBoard.tiles[2][3] = { type: TileType.Grass };

        await boardGameService.createBoard(newBoard);
        const boards = await boardGameService.collection.find({}).toArray();
        assert.equal(boards.length, COLLECTION_SIZE_AFTER_CREATION);
        assert.deepEqual(
            boards.find((x) => x.name === newBoard.name),
            newBoard,
        );
    });

    it('should throw an error when board is invalid', async () => {
        const invalidBoard: BoardGame = {
            id: '',
            name: '',
            description: '',
            size: BoardGameSize.Small,
            gameMode: GameMode.Normal,
            tiles: [],
            previewImage: '',
            visibility: true,
            lastModified: new Date(),
        } as BoardGame;
        try {
            await boardGameService.createBoard(invalidBoard);
            assert.fail('Expected an error to be thrown but none was thrown');
        } catch (error) {
            assert.instanceOf(error, HttpException);
            assert.strictEqual(error.status, BAD_REQUEST);
            assert.match(error.message, /Les données du jeu sont manquantes./);
        }
    });

    it('should modify an existing board', async () => {
        const rows = 10;
        const cols = 10;

        const modifiedBoard: BoardGame = {
            id: '12345',
            name: 'board name',
            description: 'A fun and exciting test game!',
            size: BoardGameSize.Small,
            gameMode: GameMode.Normal,
            tiles: Array(rows)
                .fill(null)
                .map(() =>
                    Array(cols)
                        .fill(null)
                        .map(() => ({ type: TileType.Water })),
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

        await boardGameService.updateBoard(modifiedBoard);
        const boards = await boardGameService.collection.find({}).toArray();
        assert.equal(boards.length, 2);
        assert.deepEqual(boards.find((x) => x.id === testBoard.id)?.name, modifiedBoard.name);
    });

    it('should delete an existing board', async () => {
        await boardGameService.deleteBoard('12345');
        const courses = await boardGameService.collection.find({}).toArray();
        assert.equal(courses.length, 1);
    });

    it('should throw an error if board to delete not found', async () => {
        const testId = 'test-id';

        try {
            await boardGameService.deleteBoard(testId);
            assert.fail('Expected an error to be thrown but none was thrown');
        } catch (error) {
            assert.strictEqual(error.message, 'Échec lors de la suppression du jeu.');
        }
    });

    it('should throw an error if board to update is not found', async () => {
        const nonExistentBoard: BoardGame = {
            ...testBoard,
            name: 'new name',
            id: 'invalid-id',
        };
        try {
            await boardGameService.updateBoard(nonExistentBoard);
            assert.fail('Expected an error to be thrown but none was thrown');
        } catch (error) {
            assert.instanceOf(error, Error);
            assert.strictEqual(error.message, 'Échec lors de la mise à jour du jeu.');
        }
    });

    it('should throw a validation error if the board data is invalid', async () => {
        const invalidBoard = {
            ...testBoard,
            name: '',
        };

        try {
            await boardGameService.updateBoard(invalidBoard);
            assert.fail('Expected an error to be thrown but none was thrown');
        } catch (error) {
            assert.instanceOf(error, HttpException);
            assert.strictEqual(error.message, 'Le jeu doit avoir un nom.');
        }
    });
});

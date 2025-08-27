import { Application } from '@app/app';
import { HttpException } from '@app/classes/http-exception/http.exception';
import { BoardGameService } from '@app/services/board-game/board-game.service';
import { BoardGame } from '@common/board-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { GameMode } from '@common/enums/game-mode';
import { TileType } from '@common/enums/tile-type';
import { assert } from 'chai';
import { StatusCodes } from 'http-status-codes';
import * as sinon from 'sinon';
import * as supertest from 'supertest';
import { Container } from 'typedi';

describe('BoardGame Controller', () => {
    let stubbedBoardGameService: sinon.SinonStubbedInstance<BoardGameService>;
    let expressApp: Express.Application;
    const sandbox = sinon.createSandbox();
    let testBoard: BoardGame;

    beforeEach(() => {
        sandbox.restore();
        sinon.restore();
        stubbedBoardGameService = sandbox.createStubInstance(BoardGameService);

        const app = Container.get(Application);
        Object.defineProperty(app['boardGameController'], 'boardGameService', { value: stubbedBoardGameService });
        expressApp = app.app;
        testBoard = {
            id: '12345',
            name: 'My Awesome Board Game',
            description: 'A fun and exciting game!',
            size: BoardGameSize.Small,
            gameMode: GameMode.Normal,
            tiles: [
                [
                    {
                        type: TileType.Wall,
                    },
                ],
            ],
            previewImage: 'url_to_preview_image',
            visibility: true,
            lastModified: new Date(),
        };
    });

    afterEach(() => {
        sandbox.restore();
        sinon.restore();
    });

    it('should return an error if getting the boards fails', async () => {
        stubbedBoardGameService.getAllBoards.rejects(new Error('Some error occurred'));

        return supertest(expressApp)
            .get('/api/board-game')
            .expect(StatusCodes.NOT_FOUND)
            .then((response) => {
                assert.equal(response.text, 'Some error occurred');
            });
    });

    it('should return a list of boards if found', async () => {
        stubbedBoardGameService.getAllBoards.resolves([testBoard]);
        return supertest(expressApp)
            .get('/api/board-game')
            .expect(StatusCodes.OK)
            .then((response) => {
                const responseBody = {
                    ...response.body[0],
                    lastModified: new Date(response.body[0].lastModified),
                };
                assert.deepEqual(responseBody, testBoard);
            });
    });

    it('should return an empty list if no boards are found', async () => {
        stubbedBoardGameService.getAllBoards.resolves([]);

        return supertest(expressApp)
            .get('/api/board-game')
            .expect(StatusCodes.OK)
            .then((response) => {
                assert.deepEqual(response.body, []);
            });
    });

    it('should return an error if board does not exist', async () => {
        stubbedBoardGameService.getBoard.rejects(new Error('Le jeu n a pas été trouvé.'));

        return supertest(expressApp)
            .get('/api/board-game/test')
            .expect(StatusCodes.NOT_FOUND)
            .then((response) => {
                assert.equal(response.text, 'Le jeu n a pas été trouvé.');
            });
    });

    it('should return the board if it exists', async () => {
        stubbedBoardGameService.getBoard.resolves(testBoard);

        return supertest(expressApp)
            .get('/api/board-game/test')
            .expect(StatusCodes.OK)
            .then((response) => {
                const expectedResponse = {
                    ...testBoard,
                    lastModified: testBoard.lastModified.toISOString(),
                };
                assert.deepEqual(response.body, expectedResponse);
            });
    });

    it('should return an error if board is not found', async () => {
        stubbedBoardGameService.getBoard.resolves();

        return supertest(expressApp)
            .get('/api/board-game/test')
            .expect(StatusCodes.NOT_FOUND)
            .then((response) => {
                assert.equal(response.text, 'Le jeu n a pas été trouvé.');
            });
    });

    it('should return an error if board creation fails', async () => {
        const errorMessage = 'Board creation failed';
        const errorResponse = new HttpException(errorMessage, StatusCodes.BAD_REQUEST);
        stubbedBoardGameService.createBoard.rejects(errorResponse);
        return supertest(expressApp)
            .post('/api/board-game/')
            .send(testBoard)
            .expect(StatusCodes.BAD_REQUEST)
            .then((response) => {
                assert.deepEqual(response.body, { error: errorMessage });
            });
    });

    it('should create board successfully', async () => {
        stubbedBoardGameService.createBoard.resolves();

        return supertest(expressApp)
            .post('/api/board-game/')
            .send(testBoard)
            .expect(StatusCodes.CREATED)
            .then((response) => {
                const responseBody = { ...response.body, lastModified: new Date(response.body.lastModified) };
                assert.deepEqual(responseBody, testBoard);
            });
    });

    it('should return an error if board data in creation is missing', async () => {
        return supertest(expressApp).post('/api/board-game/').send().expect(StatusCodes.BAD_REQUEST);
    });

    it('should update board successfully', async () => {
        const testBoardWithId = { ...testBoard, name: 'new name' };
        stubbedBoardGameService.updateBoard.resolves();

        return supertest(expressApp).put('/api/board-game/12345').send(testBoardWithId).expect(StatusCodes.OK);
    });

    it('should return an error if board update fails', async () => {
        stubbedBoardGameService.updateBoard.rejects(new Error('Une erreur serveur est survenue.'));

        return supertest(expressApp)
            .put('/api/board-game/test')
            .send()
            .expect(StatusCodes.BAD_REQUEST)
            .then((response) => {
                assert.deepEqual(response.body, { error: 'Une erreur serveur est survenue.' });
            });
    });

    it('should return an HttpError if board update fails', async () => {
        const httpError = new HttpException('Le nom du jeu doit être unique.', StatusCodes.BAD_REQUEST);

        stubbedBoardGameService.updateBoard.rejects(httpError);

        return supertest(expressApp)
            .put('/api/board-game/test')
            .send()
            .expect(StatusCodes.BAD_REQUEST)
            .then((response) => {
                assert.deepEqual(response.body, { error: 'Le nom du jeu doit être unique.' });
            });
    });

    it('should delete board successfully', async () => {
        stubbedBoardGameService.deleteBoard.resolves();

        return supertest(expressApp).delete('/api/board-game/12345').send().expect(StatusCodes.NO_CONTENT);
    });

    it('should return an error if board deletion fails', async () => {
        stubbedBoardGameService.deleteBoard.rejects(new Error('Échec lors de la suppression du jeu.'));
        return supertest(expressApp)
            .delete('/api/board-game/test')
            .send()
            .expect(StatusCodes.NOT_FOUND)
            .then((response) => {
                assert.equal(response.text, 'Échec lors de la suppression du jeu.');
            });
    });
});

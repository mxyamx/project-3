import { HttpException } from '@app/classes/http-exception/http.exception';
import { BoardGameService } from '@app/services/board-game/board-game.service';
import { BoardGame } from '@common/board-game';
import { Request, Response, Router } from 'express';
import httpStatus from 'http-status-codes';
import { Service } from 'typedi';

@Service()
export class BoardGameController {
    router: Router;

    constructor(private readonly boardGameService: BoardGameService) {
        this.configureRouter();
    }

    private configureRouter(): void {
        this.router = Router();
        /**
         * @swagger
         *
         * definitions:
         *   BoardGame:
         *     type: object
         *     properties:
         *       id:
         *         type: string
         *       name:
         *         type: string
         *       description:
         *         type: string
         *       size:
         *         type: string
         *         enum:
         *           - "10x10"
         *           - "15x15"
         *           - "20x20"
         *       gameMode:
         *         type: string
         *         enum:
         *           - "normal"
         *           - "CTF"
         *       tiles:
         *         type: array
         *         items:
         *           type: array
         *           items:
         *             type: object
         *             properties:
         *               type:
         *                 type: string
         *       previewImage:
         *         type: string
         *       visibility:
         *         type: boolean
         *       lastModified:
         *         type: string
         *         format: date-time
         */

        /**
         * @swagger
         * tags:
         *   - name: Board-Game
         *     description: Board-game endpoint
         */

        /**
         * @swagger
         *
         * /api/board-game:
         *   get:
         *     description: Return current games
         *     tags:
         *       - Board-game
         *     produces:
         *       - application/json
         *     responses:
         *       200:
         *         schema:
         *           $ref: '#/definitions/BoardGame'
         *
         */
        this.router.get('/', async (req: Request, res: Response) => {
            try {
                const boards = await this.boardGameService.getAllBoards();
                res.status(httpStatus.OK).json(boards);
            } catch (error) {
                res.status(httpStatus.NOT_FOUND).send(error.message);
            }
        });

        /**
         * @swagger
         *
         * /api/board-game/{id}:
         *   get:
         *     description: Return specific game
         *     tags:
         *       - Board-game
         *     produces:
         *       - application/json
         *     parameters:
         *       - name: id
         *         in: path
         *         description: ID of the board game
         *         required: true
         *         schema:
         *           type: string
         *     responses:
         *       200:
         *         schema:
         *           $ref: '#/definitions/BoardGame'
         *       404:
         *         description: Board-game not found
         */
        this.router.get('/:id', async (req: Request, res: Response) => {
            try {
                const board = await this.boardGameService.getBoard(req.params.id);
                if (!board) {
                    res.status(httpStatus.NOT_FOUND).send('Le jeu n a pas été trouvé.');
                    return;
                }
                res.status(httpStatus.OK).json(board);
            } catch (error) {
                res.status(httpStatus.NOT_FOUND).send(error.message);
            }
        });

        /**
         * @swagger
         *
         * /api/board-game:
         *   post:
         *     description: Create a board game
         *     tags:
         *       - Board-game
         *     requestBody:
         *       description: New board game to be created
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             $ref: '#/definitions/BoardGame'
         *           example:
         *             id: "12345"
         *             name: "My Awesome Board Game"
         *             description: "A fun and exciting game!"
         *             size: "15x15"
         *             gameMode: "normal"
         *             tiles: [[{"type": "empty"}]]
         *             previewImage: "url_to_preview_image"
         *             visibility: true
         *             lastModified: "2025-01-19T12:00:00Z"
         *     responses:
         *       201:
         *         description: Created
         *       400:
         *         description : échec de l'opération.
         */
        this.router.post('/', async (req: Request, res: Response) => {
            try {
                if (req.body && req.body.id) {
                    const board: BoardGame = req.body;
                    await this.boardGameService.createBoard(board);
                    res.status(httpStatus.CREATED).json(board);
                } else {
                    res.sendStatus(httpStatus.BAD_REQUEST).json({ error: 'Le corps de la requête est invalide.' });
                }
            } catch (error) {
                if (error instanceof HttpException) {
                    res.status(error.status).json({ error: error.message });
                } else {
                    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Une erreur serveur est survenue.' });
                }
            }
        });

        /**
         * @swagger
         *
         * /api/board-game/{id}:
         *   put:
         *     description: Update an existing board game
         *     tags:
         *       - Board-game
         *     parameters:
         *       - name: id
         *         in: path
         *         description: ID of the board game to update
         *         required: true
         *         schema:
         *           type: string
         *     requestBody:
         *       description: Updated board game details
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             $ref: '#/definitions/BoardGame'
         *           example:
         *             id: "12345"
         *             name: "Updated Board Game"
         *             description: "A fun and exciting game with new updates!"
         *             size: "20x20"
         *             gameMode: "CTF"
         *             tiles: [[{"type": "empty"}]]
         *             previewImage: "new_url_to_preview_image"
         *             visibility: true
         *             lastModified: "2025-01-19T12:00:00Z"
         *     responses:
         *       200:
         *         schema:
         *           $ref: '#/definitions/BoardGame'
         */
        this.router.put('/:id', async (req: Request, res: Response) => {
            try {
                await this.boardGameService.updateBoard(req.body);
                res.status(httpStatus.NO_CONTENT).send();
            } catch (error) {
                if (error instanceof HttpException) {
                    res.status(error.status).json({ error: error.message });
                } else {
                    res.status(httpStatus.BAD_REQUEST).json({ error: 'Une erreur serveur est survenue.' });
                }
            }
        });

        /**
         * @swagger
         *
         * /api/board-game/{id}:
         *   delete:
         *     description: Delete an existing board game
         *     tags:
         *       - Board-game
         *     parameters:
         *       - name: id
         *         in: path
         *         description: ID of the board game to delete
         *         required: true
         *         schema:
         *           type: string
         *     requestBody:
         *       description: Updated board game details
         *       required: true
         *     responses:
         *       204:
         *         description : No Content
         *       404:
         *         description : échec de l'opération.
         */
        this.router.delete('/:id', async (req: Request, res: Response) => {
            try {
                await this.boardGameService.deleteBoard(req.params.id);
                res.status(httpStatus.NO_CONTENT).send();
            } catch (error) {
                res.status(httpStatus.NOT_FOUND).send(error.message);
            }
        });
    }
}

import { HttpException } from '@app/classes/http-exception/http.exception';
import { UsersService } from '@app/services/users/users.service';
import { User } from '@common/user';
import { Request, Response, Router } from 'express';
import httpStatus from 'http-status-codes';
import { Service } from 'typedi';

@Service()
export class UsersController {
    router: Router;

    constructor(private readonly usersService: UsersService) {
        this.configureRouter();
    }

    private configureRouter(): void {
        this.router = Router();

        /**
         * @swagger
         *
         * definitions:
         *   User:
         *     type: object
         *     properties:
         *       id:
         *         type: string
         *       username:
         *         type: string
         *       email:
         *         type: string
         *       avatar:
         *         type: string
         *       friends:
         *         type: array
         *         items:
         *           $ref: '#/definitions/User'
         *       blocked:
         *         type: array
         *         items:
         *           $ref: '#/definitions/User'
         *       inventory:
         *         type: array
         *         items:
         *           type: string
         *       money:
         *         type: number
         *       parameters:
         *         type: object
         *         properties:
         *           language:
         *             type: string
         *           theme:
         *             type: string
         *       statistics:
         *         type: object
         *         description: PlayerStatistics object
         */

        /**
         * @swagger
         * tags:
         *   - name: Users
         *     description: User management endpoints
         */

        /**
         * @swagger
         * /api/users:
         *   get:
         *     description: Get all users
         *     tags:
         *       - Users
         *     produces:
         *       - application/json
         *     responses:
         *       200:
         *         description: List of all users
         *         schema:
         *           type: array
         *           items:
         *             $ref: '#/definitions/User'
         */
        this.router.get('/', async (req: Request, res: Response) => {
            try {
                const users = await this.usersService.getAllUsers();
                res.status(httpStatus.OK).json(users);
            } catch (error) {
                res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
            }
        });

        /**
         * @swagger
         * /api/users/{id}:
         *   get:
         *     description: Get a user by ID
         *     tags:
         *       - Users
         *     parameters:
         *       - name: id
         *         in: path
         *         description: User ID
         *         required: true
         *         schema:
         *           type: string
         *     responses:
         *       200:
         *         description: User found
         *         schema:
         *           $ref: '#/definitions/User'
         *       404:
         *         description: User not found
         */
        this.router.get('/:id', async (req: Request, res: Response) => {
            try {
                const user = await this.usersService.getUser(req.params.id);
                if (!user) {
                    res.status(httpStatus.NOT_FOUND).json({ error: 'Utilisateur introuvable.' });
                    return;
                }
                res.status(httpStatus.OK).json(user);
            } catch (error) {
                res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
            }
        });

        /**
         * @swagger
         * /api/users:
         *   post:
         *     description: Create a new user
         *     tags:
         *       - Users
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             $ref: '#/definitions/User'
         *           example:
         *             id: "123"
         *             username: "testName"
         *             email: "test@example.com"
         *             avatar: "url_to_avatar"
         *             friends: []
         *             blocked: []
         *             inventory: []
         *             money: 0
         *             parameters:
         *               language: "fr"
         *               theme: "light"
         *             statistics: {}
         *     responses:
         *       201:
         *         description: Created
         *         schema:
         *           $ref: '#/definitions/User'
         *       400:
         *         description: Bad request
         */
        this.router.post('/', async (req: Request, res: Response) => {
            try {
                const user: User = req.body;
                if (!user || !user.id || !user.username || !user.email) {
                    res.status(httpStatus.BAD_REQUEST).json({ error: 'Le corps de la requête est invalide.' });
                    return;
                }
                await this.usersService.createUser(user);
                res.status(httpStatus.CREATED).json(user);
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
         * /api/users/{id}:
         *   put:
         *     description: Update an existing user
         *     tags:
         *       - Users
         *     parameters:
         *       - name: id
         *         in: path
         *         required: true
         *         schema:
         *           type: string
         *         description: User ID to update
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             $ref: '#/definitions/User'
         *           example:
         *             id: "123"
         *             username: "updatedTest"
         *             email: "test@example.com"
         *             avatar: "new_url_to_avatar"
         *             friends: []
         *             blocked: []
         *             inventory: ["item1"]
         *             money: 100
         *             parameters:
         *               language: "fr"
         *               theme: "light"
         *             statistics: {}
         *     responses:
         *       200:
         *         description: Updated successfully
         *       400:
         *         description: Invalid request
         */
        this.router.put('/:id', async (req: Request, res: Response) => {
            try {
                const user: User = req.body;
                if (!user || user.id !== req.params.id) {
                    res.status(httpStatus.BAD_REQUEST).json({ error: 'ID invalide ou corps de requête manquant.' });
                    return;
                }
                await this.usersService.updateUser(user);
                res.status(httpStatus.OK).send();
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
         * /api/users/{id}:
         *   delete:
         *     description: Delete a user (mark username as [supprimé])
         *     tags:
         *       - Users
         *     parameters:
         *       - name: id
         *         in: path
         *         required: true
         *         schema:
         *           type: string
         *         description: ID of the user to delete
         *     responses:
         *       204:
         *         description: User marked as deleted
         *       404:
         *         description: User not found
         */
        this.router.delete('/:id', async (req: Request, res: Response) => {
            try {
                await this.usersService.deleteUser(req.params.id);
                res.status(httpStatus.NO_CONTENT).send();
            } catch (error) {
                res.status(httpStatus.NOT_FOUND).json({ error: error.message });
            }
        });
        /**
         * @swagger
         *
         * /api/users/check-username/{username}:
         *   get:
         *     description: Check if a username is available
         *     tags:
         *       - Users
         *     parameters:
         *       - name: username
         *         in: path
         *         required: true
         *         schema:
         *           type: string
         *     responses:
         *       200:
         *         description: Returns true if the username is available, false otherwise
         *         content:
         *           application/json:
         *             schema:
         *               type: boolean
         */
        this.router.get('/check-username/:username', async (req: Request, res: Response) => {
            try {
                const isAvailable = await this.usersService.isUsernameAvailable(req.params.username);
                res.status(httpStatus.OK).json(isAvailable);
            } catch (err) {
                res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Une erreur est survenue.' });
            }
        });
    }
}

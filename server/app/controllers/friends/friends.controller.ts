import { AuthedRequest } from '@app/middlewares/auth.middleware';
import { FriendsService } from '@app/services/friends/friends.service';
import { Response, Router } from 'express';
import httpStatus from 'http-status-codes';
import { Service } from 'typedi';

@Service()
export class FriendsController {
    router: Router;

    constructor(private readonly friendsService: FriendsService) {
        this.router = Router();
        this.configureRouter();
    }

    private configureRouter(): void {
        // POST /friends/requests - Envoyer une demande d'ami
        this.router.post('/requests', async (req: AuthedRequest, res: Response) => {
            try {
                const senderId = req.user?.uid;
                const { receiverId } = req.body;

                if (!receiverId) {
                    res.status(httpStatus.BAD_REQUEST).json({ error: 'receiverId est requis' });
                    return;
                }

                const request = await this.friendsService.sendFriendRequest(senderId, receiverId);
                res.status(httpStatus.CREATED).json(request);
            } catch (error: unknown) {
                res.status(httpStatus.BAD_REQUEST).json({ error: (error as Error).message });
            }
        });

        // GET /friends/requests/pending - Obtenir les demandes reçues
        this.router.get('/requests/pending', async (req: AuthedRequest, res: Response) => {
            try {
                const userId = req.user?.uid;
                const requests = await this.friendsService.getPendingRequests(userId);
                res.status(httpStatus.OK).json(requests);
            } catch (error: unknown) {
                res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ error: (error as Error).message });
            }
        });

        // GET /friends/requests/sent - Obtenir les demandes envoyées
        this.router.get('/requests/sent', async (req: AuthedRequest, res: Response) => {
            try {
                const userId = req.user?.uid;
                const requests = await this.friendsService.getSentRequests(userId);
                res.status(httpStatus.OK).json(requests);
            } catch (error: unknown) {
                res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ error: (error as Error).message });
            }
        });

        // PUT /friends/requests/:requestId/accept - Accepter une demande
        this.router.put('/requests/:requestId/accept', async (req: AuthedRequest, res: Response) => {
            try {
                const userId = req.user?.uid;
                const { requestId } = req.params;

                const result = await this.friendsService.acceptFriendRequest(requestId, userId);
                res.status(httpStatus.OK).json(result);
            } catch (error: unknown) {
                res.status(httpStatus.BAD_REQUEST).json({ error: (error as Error).message });
            }
        });

        // PUT /friends/requests/:requestId/reject - Refuser une demande
        this.router.put('/requests/:requestId/reject', async (req: AuthedRequest, res: Response) => {
            try {
                const userId = req.user?.uid;
                const { requestId } = req.params;

                await this.friendsService.rejectFriendRequest(requestId, userId);
                res.status(httpStatus.NO_CONTENT).send();
            } catch (error: unknown) {
                res.status(httpStatus.BAD_REQUEST).json({ error: (error as Error).message });
            }
        });

        // DELETE /friends/requests/:requestId - Annuler une demande envoyée
        this.router.delete('/requests/:requestId', async (req: AuthedRequest, res: Response) => {
            try {
                const userId = req.user?.uid;
                const { requestId } = req.params;

                await this.friendsService.cancelFriendRequest(requestId, userId);
                res.status(httpStatus.NO_CONTENT).send();
            } catch (error: unknown) {
                res.status(httpStatus.NOT_FOUND).json({ error: (error as Error).message });
            }
        });

        // DELETE /friends/:friendId - Retirer un ami
        this.router.delete('/:friendId', async (req: AuthedRequest, res: Response) => {
            try {
                const userId = req.user?.uid;
                const { friendId } = req.params;

                await this.friendsService.removeFriend(userId, friendId);
                res.status(httpStatus.NO_CONTENT).send();
            } catch (error: unknown) {
                res.status(httpStatus.NOT_FOUND).json({ error: (error as Error).message });
            }
        });

        // GET /friends/search - Rechercher des utilisateurs
        this.router.get('/search', async (req: AuthedRequest, res: Response) => {
            try {
                const query = String(req.query.query ?? '');
                const userId = req.user?.uid;

                if (!query) {
                    res.status(httpStatus.BAD_REQUEST).json({ error: 'Query parameter est requis' });
                    return;
                }

                const users = await this.friendsService.searchUsers(query, userId);
                res.status(httpStatus.OK).json(users);
            } catch (error: unknown) {
                res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ error: (error as Error).message });
            }
        });

        // GET /friends - Obtenir la liste d'amis
        this.router.get('/', async (req: AuthedRequest, res: Response) => {
            try {
                const userId = req.user?.uid;
                const friends = await this.friendsService.getFriendsList(userId);
                res.status(httpStatus.OK).json(friends);
            } catch (error: unknown) {
                res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ error: (error as Error).message });
            }
        });
    }
}
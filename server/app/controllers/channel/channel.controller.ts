import { AuthedRequest } from '@app/middlewares/auth.middleware';
import { ChannelService } from '@app/services/channel/channel.service';
import { Channel } from '@common/channel';
import { Response, Router } from 'express';
import httpStatus from 'http-status-codes';
import { Service } from 'typedi';

@Service()
export class ChannelController {
    router: Router;

    constructor(private readonly channelService: ChannelService) {
        this.router = Router();
        this.configureRouter();
    }

    private configureRouter(): void {
        // GET /channel/my
        this.router.get('/my', async (req: AuthedRequest, res: Response) => {
            try {
                const userId = req.user?.uid;
                const channels = await this.channelService.getChannelsByUserId(userId);
                res.status(httpStatus.OK).json(channels);
            } catch (error: unknown) {
                res.status(httpStatus.NOT_FOUND).json({ error: (error as Error).message });
            }
        });

        // POST /channel
        this.router.post('/', async (req: AuthedRequest, res: Response) => {
            try {
                const userId = req.user?.uid;
                const payload: Channel = req.body;
                if (!payload || !payload.name) {
                    res.status(httpStatus.BAD_REQUEST).json({ error: 'Le corps de la requête est invalide.' });
                    return;
                }
                const created = await this.channelService.createChannel(payload, userId);
                res.status(httpStatus.CREATED).json(created);
            } catch (error: unknown) {
                res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ error: (error as Error).message || 'Une erreur serveur est survenue.' });
            }
        });

        this.router.get('/search', async (req: AuthedRequest, res: Response) => {
            try {
                const pattern = String(req.query.pattern ?? '');
                const userId = req.user?.uid!;
                const items = await this.channelService.searchChannelsByPattern(pattern, userId);
                res.status(httpStatus.OK).json(items);
            } catch (error: unknown) {
                res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ error: (error as Error).message });
            }
        });

        //DELETE /channel/:id
        this.router.delete('/:id', async (req: AuthedRequest, res: Response) => {
            try {
                await this.channelService.deleteChannel(req.params.id);
                res.status(httpStatus.NO_CONTENT).send();
            } catch (error: unknown) {
                res.status(httpStatus.NOT_FOUND).json({ error: (error as Error).message });
            }
        });

        // POST /channel/:id/join
        this.router.post('/:id/join', async (req: AuthedRequest, res: Response) => {
            try {
                const channelId = req.params.id;
                const userId = req.user?.uid;

                await this.channelService.joinChannel(channelId, userId);
                res.status(httpStatus.NO_CONTENT).send();
            } catch (error: unknown) {
                res.status(httpStatus.NOT_FOUND).json({ error: (error as Error).message });
            }
        });

        // DELETE /channel/:id/leave
        this.router.delete('/:id/leave', async (req: AuthedRequest, res: Response) => {
            try {
                const channelId: string = req.params.id;
                const userId = req.user?.uid;

                await this.channelService.leaveChannel(channelId, userId);
                res.status(httpStatus.NO_CONTENT).send();
            } catch (error: unknown) {
                res.status(httpStatus.NOT_FOUND).json({ error: (error as Error).message });
            }
        });
    }
}

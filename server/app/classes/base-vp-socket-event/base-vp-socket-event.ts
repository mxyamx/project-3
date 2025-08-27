import { VpGameSessionManager } from '@app/classes/vp-game-session/vp-game-session-manager';
import { VpSocketManager } from '@app/classes/vp-socket-manager/vp-socket-manager';
import { VpState } from '@app/classes/vp-state/vp-state';
import { SocketClientEventNames, SocketServerEventNames } from '@common/enums/socket-events-names';
import * as dataForm from '@common/socket-data-forms';
import { VirtualPlayer } from '@common/virtual-player';

export abstract class BaseVpSocketEvent {
    protected activePlayer: VirtualPlayer;
    protected gameState: dataForm.GetGameStateRes;

    constructor(
        protected readonly gameId: string,
        protected readonly virtualPlayer: VirtualPlayer,
        protected readonly vpGameSessionManager: VpGameSessionManager,
        protected readonly vpState: VpState,
    ) {}

    protected async awaitEvent<T>(vpSocket: VpSocketManager, eventToListen: string, eventToEmit: string, req: unknown): Promise<T> {
        return new Promise((resolve) => {
            vpSocket.clientSocket.once(eventToListen, (data: T) => {
                resolve(data);
            });
            vpSocket.clientSocket.emit(eventToEmit, req);
        });
    }

    protected async getGameState(vpSocket: VpSocketManager): Promise<void> {
        const gameStateReq = {
            gameCode: this.gameId,
        } as dataForm.GetGameStateReq;
        const data = await this.awaitEvent<dataForm.GetGameStateRes>(
            vpSocket,
            SocketClientEventNames.GameState,
            SocketServerEventNames.GetGameState,
            gameStateReq,
        );
        if (data.successful) {
            this.gameState = data;
        }
    }

    protected async getActivePlayer(vpSocket: VpSocketManager): Promise<void> {
        const activePlayerReq = {
            gameCode: this.gameId,
        } as dataForm.GetActivePlayerReq;
        const data = await this.awaitEvent<dataForm.GetActivePlayerRes>(
            vpSocket,
            SocketClientEventNames.GetActivePlayer,
            SocketServerEventNames.GetActivePlayer,
            activePlayerReq,
        );
        if (data.successful) {
            this.activePlayer = data.activePlayer as VirtualPlayer;
        }
    }

    protected isVPTurn(vpSocket: VpSocketManager): boolean {
        const result =
            this.activePlayer && vpSocket.clientSocket.id === this.activePlayer.socketId && this.activePlayer.name === this.virtualPlayer.name;
        return result;
    }

    protected registerClock(vpSocket: VpSocketManager): void {
        vpSocket.clientSocket.on(SocketClientEventNames.Clock, async (data: dataForm.ClockRes) => {
            await Promise.all([this.getGameState(vpSocket), this.getActivePlayer(vpSocket)]);
            if (!data.successful) return;
            this.handleClock(data, vpSocket);
        });
    }

    abstract configure(vpSocket: VpSocketManager): void;

    protected abstract handleClock(data: dataForm.ClockRes, vpSocket: VpSocketManager): void;
}

import { Injectable, inject } from '@angular/core';
import { SocketClientService } from '../client-socket/socket-client.service';

@Injectable({
    providedIn: 'root',
})
export class SessionManagerService {
    private socketService = inject(SocketClientService);

    async establishUserSession(firebaseId: string): Promise<string> {
        if (this.socketService.isSocketAlive()) {
            return 'SUCCESS';
        }

        return new Promise((resolve) => {
            let resolved = false;

            const cleanup = (successListener: any, errorListener: any) => {
                this.socketService.off('connection-success', successListener);
                this.socketService.off('connection-error', errorListener);
            };

            const successListener = () => {
                if (resolved) return;
                resolved = true;
                cleanup(successListener, errorListener);
                resolve('SUCCESS');
            };

            const errorListener = (error: any) => {
                if (resolved) return;
                resolved = true;
                cleanup(successListener, errorListener);
                resolve(error.code || 'UNKNOWN_ERROR');
            };

            this.socketService.connect(firebaseId);
            this.socketService.on('connection-success', successListener);
            this.socketService.on('connection-error', errorListener);
            this.socketService.startConnection();

            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    cleanup(successListener, errorListener);
                    resolve('TIMEOUT');
                }
            }, 5000);
        });
    }

    disconnect(): void {
        this.socketService.disconnect();
    }

    isUserSessionActive(): boolean {
        return this.socketService.isSocketAlive();
    }
}

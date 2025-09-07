import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChatComponent } from '@app/components/chat/chat.component';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';

@Component({
    selector: 'app-chat-page',
    imports: [ChatComponent],
    templateUrl: './chat-page.component.html',
    styleUrl: './chat-page.component.scss',
})
export class ChatPageComponent implements OnInit, OnDestroy {
    private route = inject(ActivatedRoute);
    //Broadcast Channel Api so we can communicate with other tabs/windows from the same origin
    private bus = new BroadcastChannel('chat');
    private playerSocketService = inject(PlayerSocketService);

    gameId: string | null = null;
    playerName: string | null = null;
    ngOnInit(): void {
        this.gameId = this.route.snapshot.queryParamMap.get('gameId');
        const playerName = this.route.snapshot.queryParamMap.get('playerName') || '';
        if (!this.gameId || !playerName) {
            return;
        }

        this.playerSocketService.connect();
        this.bus.postMessage({ type: 'POPUP_OPENED' });

        window.addEventListener('beforeunload', () => {
            this.bus.postMessage({ type: 'POPUP_CLOSED' });
        });

        this.bus.onmessage = (e) => {
            if (e.data?.type === 'LEFT_GAME') {
                window.close();
            }
        };
    }

    ngOnDestroy() {
        this.bus.postMessage({ type: 'POPUP_CLOSED' });
        this.bus.close();
    }
}

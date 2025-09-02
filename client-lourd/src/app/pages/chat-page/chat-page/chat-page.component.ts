import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChatComponent } from '@app/components/chat/chat.component';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { DiceBonus } from '@common/enums/dice-bonus';
import { Player } from '@common/player';

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
    player: Player | null = null;
    ngOnInit(): void {
        this.gameId = this.route.snapshot.queryParamMap.get('gameId');
        const playerName = this.route.snapshot.queryParamMap.get('playerName');
        if (!this.gameId || !playerName) return;
        this.player = {
            name: playerName,
            character: 'assets/avatars/bear.png',
            attributes: {
                attackValue: 2,
                defenseValue: 3,
                speedValue: 4,
                healthValue: 4,
                bonusAttack: DiceBonus.SixSideBonus,
                bonusDefense: DiceBonus.FourSideBonus,
            },
            organizer: false,
            color: 'blue',
            victories: 0,
        };

        this.playerSocketService.connect();
        this.bus.postMessage({ type: 'POPUP_OPENED' });

        window.addEventListener('beforeunload', () => {
            this.bus.postMessage({ type: 'POPUP_CLOSED' });
        });
    }

    ngOnDestroy() {
        this.bus.postMessage({ type: 'POPUP_CLOSED' });
        this.bus.close();
    }
}

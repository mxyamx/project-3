import { Component, inject, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ChatContainerComponent } from '@app/components/chat-container/chat-container.component';
import { GlobalStatisticsComponent } from '@app/components/global-statistics/global-statistics.component';
import { PlayerStatisticsComponent } from '@app/components/player-statistics/player-statistics.component';
import { ChatDockService } from '@app/services/chat-dock/chat-dock.service';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-statistics-page',
    imports: [RouterLink, ChatContainerComponent, GlobalStatisticsComponent, PlayerStatisticsComponent, ChatContainerComponent, TranslatePipe],
    standalone: true,
    templateUrl: './statistics-page.component.html',
    styleUrl: './statistics-page.component.scss',
})
export class StatisticsPageComponent implements OnDestroy {
    socketService = inject(SocketClientService);
    gameSessionManager: GameSessionManagerService = inject(GameSessionManagerService);
    chatDockService: ChatDockService = inject(ChatDockService);
    gameId: string = '';

    constructor(private router: Router) {
        const navigation = this.router.getCurrentNavigation();
        const state = navigation?.extras.state as { data: string };
        if (state) {
            this.gameId = state.data;
        }
    }

    ngOnDestroy(): void {
        this.socketService.disconnect();
    }
}

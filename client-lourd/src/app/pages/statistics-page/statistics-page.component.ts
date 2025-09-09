import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChatComponent } from '@app/components/chat/chat.component';
import { GlobalStatisticsComponent } from '@app/components/global-statistics/global-statistics.component';
import { PlayerStatisticsComponent } from '@app/components/player-statistics/player-statistics.component';
import { ChatDockService } from '@app/services/chat-dock/chat-dock.service';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';

@Component({
    selector: 'app-statistics-page',
    imports: [RouterLink, ChatComponent, GlobalStatisticsComponent, PlayerStatisticsComponent],
    standalone: true,
    templateUrl: './statistics-page.component.html',
    styleUrl: './statistics-page.component.scss',
})
export class StatisticsPageComponent implements OnInit {
    chat: ChatComponent;
    socketService = inject(SocketClientService);
    gameSessionManager: GameSessionManagerService = inject(GameSessionManagerService);
    chatDockService: ChatDockService = inject(ChatDockService);
    ngOnInit(): void {
        this.connect();
        this.chat.joinRoom();
    }
    connect() {
        if (!this.socketService.isSocketAlive()) {
            this.socketService.connect();
        }
    }
}

import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChatComponent } from '@app/components/chat/chat.component';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { GlobalStatisticsComponent } from '@app/components/global-statistics/global-statistics.component';
import { PlayerStatisticsComponent } from '@app/components/player-statistics/player-statistics.component';

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

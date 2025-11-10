import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ChatContainerComponent } from '@app/components/chat-container/chat-container.component';
import { GlobalStatisticsComponent } from '@app/components/global-statistics/global-statistics.component';
import { PlayerStatisticsComponent } from '@app/components/player-statistics/player-statistics.component';
import { ChatDockService } from '@app/services/chat-dock/chat-dock.service';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { HttpUserService } from '@app/services/http-manager/http-users.service';
import { UserManagerService } from '@app/services/user-manager/user-manager.service';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-statistics-page',
    imports: [RouterLink, ChatContainerComponent, GlobalStatisticsComponent, PlayerStatisticsComponent, ChatContainerComponent, TranslatePipe],
    standalone: true,
    templateUrl: './statistics-page.component.html',
    styleUrl: './statistics-page.component.scss',
})
export class StatisticsPageComponent implements OnInit {
    socketService = inject(SocketClientService);
    gameSessionManager: GameSessionManagerService = inject(GameSessionManagerService);
    private httpUserService: HttpUserService = inject(HttpUserService);
    userManagerService: UserManagerService = inject(UserManagerService);
    chatDockService: ChatDockService = inject(ChatDockService);
    gameId: string = '';

    async ngOnInit() {
        const navigation = this.router.getCurrentNavigation();
        const state = navigation?.extras.state as { data: string } | undefined;
        if (state) this.gameId = state.data;

        const userId = this.userManagerService.currentUser().id;
        if (!userId) {
            return;
        }

        try {
            const user = await firstValueFrom(this.httpUserService.getUser(userId));
            this.userManagerService.currentUser.set(user);
        } catch (e) {
            console.error(e);
        }
    }

    constructor(private router: Router) {
        const navigation = this.router.getCurrentNavigation();
        const state = navigation?.extras.state as { data: string };
        if (state) {
            this.gameId = state.data;
        }
    }
}

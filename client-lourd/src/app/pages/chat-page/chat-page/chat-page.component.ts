import { Component, OnInit } from '@angular/core';
import { ChatContainerComponent } from '@app/components/chat-container/chat-container.component';

@Component({
    selector: 'app-chat-page',
    imports: [ChatContainerComponent],
    templateUrl: './chat-page.component.html',
    styleUrl: './chat-page.component.scss',
})
export class ChatPageComponent implements OnInit {
    // private route = inject(ActivatedRoute);
    // private chatDockService = inject(ChatDockService);
    // private userManager = inject(UserManagerService);
    // //Broadcast Channel Api so we can communicate with other tabs/windows from the same origin
    // private bus = new BroadcastChannel('chat');

    gameId: string;
    ngOnInit(): void {
        // this.gameId = this.route.snapshot.queryParamMap.get('gameId') || ROOM_GENERAL;
        // this.chatDockService.playerName.set(this.route.snapshot.queryParamMap.get('playerName') || this.userManager.currentUser().username);
        // this.bus.postMessage({ type: 'POPUP_OPENED' });
        // window.addEventListener('beforeunload', () => {
        //     this.bus.postMessage({ type: 'POPUP_CLOSED' });
        // });
        // this.bus.onmessage = (e) => {
        //     if (e.data?.type === 'LEFT_GAME') {
        //         window.close();
        //     }
        // };
    }

    // ngOnDestroy() {
    //     this.bus.postMessage({ type: 'POPUP_CLOSED' });
    //     this.bus.close();
    // }
}

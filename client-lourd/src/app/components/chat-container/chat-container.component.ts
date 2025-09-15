import { Component, Input, OnInit, signal, WritableSignal } from '@angular/core';
import { ChannelSummary } from '@common/channel';
import { ROOM_GAME_NAME, ROOM_GENERAL } from '@common/constants/chat.constants';
import { ChannelNavigatorComponent } from '../channel-navigator/channel-navigator.component';
import { ChatComponent } from '../chat/chat.component';

@Component({
    selector: 'app-chat-container',
    standalone: true,
    imports: [ChatComponent, ChannelNavigatorComponent],
    templateUrl: './chat-container.component.html',
    styleUrl: './chat-container.component.scss',
})
export class ChatContainerComponent implements OnInit {
    @Input() gameId: string | null = null;
    showChannelNavigator: WritableSignal<boolean> = signal(true);
    channelId: string = ROOM_GENERAL;
    isPopup: boolean = true;
    gameChannel: ChannelSummary | null = null;

    ngOnInit(): void {
        if (this.gameId) {
            this.gameChannel = {
                id: this.gameId,
                name: ROOM_GAME_NAME,
                createdAt: new Date(),
                isAdmin: false,
                isManageable: false,
                memberCount: 0,
            };
        }
    }

    openChat(channelId: string) {
        this.channelId = channelId;
        this.showChannelNavigator.set(false);
    }

    closeChat(): void {
        this.showChannelNavigator.set(true);
    }
}

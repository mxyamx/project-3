import { Component, Input, OnInit, signal, WritableSignal } from '@angular/core';
import { ChannelSummary } from '@common/channel';
import { CHANNEL_GAME_NAME, CHANNEL_GENERAL_ID, CHANNEL_GENERAL_NAME } from '@common/constants/chat.constants';
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
    @Input() isPopup: boolean = false;
    @Input() isExpended: boolean = false;
    showChannelNavigator: WritableSignal<boolean> = signal(true);
    channelId: string = CHANNEL_GENERAL_ID;
    channelName: string = CHANNEL_GENERAL_NAME;

    gameChannel: ChannelSummary | null = null;

    ngOnInit(): void {
        if (this.gameId) {
            this.gameChannel = {
                id: `GAME-${this.gameId}`,
                name: CHANNEL_GAME_NAME,
                createdAt: new Date(),
                isAdmin: false,
                isManageable: false,
                memberCount: 0,
            };
        }
    }

    openChat(channel: ChannelSummary) {
        this.channelId = channel.id;
        this.channelName = channel.name;
        this.showChannelNavigator.set(false);
    }

    closeChat(): void {
        this.showChannelNavigator.set(true);
    }
}

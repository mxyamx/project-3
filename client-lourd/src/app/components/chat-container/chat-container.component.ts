import { Component, signal, WritableSignal } from '@angular/core';
import { ROOM_GENERAL } from '@common/constants/chat.constants';
import { ChannelNavigatorComponent } from '../channel-navigator/channel-navigator.component';
import { ChatComponent } from '../chat/chat.component';

@Component({
    selector: 'app-chat-container',
    imports: [ChatComponent, ChannelNavigatorComponent],
    templateUrl: './chat-container.component.html',
    styleUrl: './chat-container.component.scss',
})
export class ChatContainerComponent {
    showChannelNavigator: WritableSignal<boolean> = signal(true);
    channelId: string = ROOM_GENERAL;
    isPopup: boolean = true;

    openChat(channelId: string) {
        this.channelId = channelId;
        this.showChannelNavigator.set(false);
    }

    closeChat(): void {
        this.showChannelNavigator.set(true);
    }
}

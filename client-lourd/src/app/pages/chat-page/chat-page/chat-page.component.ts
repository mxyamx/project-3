import { Component, inject, OnInit } from '@angular/core';
import { ChatContainerComponent } from '@app/components/chat-container/chat-container.component';
import { ChatService } from '@app/services/chat/chat.service';
import { PopupChatBridgeService } from '@app/services/popup-chat-bridge/popup-chat-bridge.service';

@Component({
    selector: 'app-chat-page',
    imports: [ChatContainerComponent],
    templateUrl: './chat-page.component.html',
    styleUrl: './chat-page.component.scss',
})
export class ChatPageComponent implements OnInit {
    gameId: string;
    private bridge = inject(PopupChatBridgeService);
    private chatService: ChatService = inject(ChatService);

    channels: any[] = [];
    messages: any[] = [];
    text = '';
    ngOnInit(): void {
        this.bridge.onChannels((chs) => {
            console.log(chs);
            this.channels = chs;
        });
        this.chatService.chatDetache.set(true);
    }

    loadChannels() {
        this.bridge.requestChannels();
    }
}

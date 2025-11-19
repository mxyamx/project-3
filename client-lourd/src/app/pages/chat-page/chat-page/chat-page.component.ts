import { Component, inject, OnInit } from '@angular/core';
import { ChatContainerComponent } from '@app/components/chat-container/chat-container.component';
import { ChatService } from '@app/services/chat/chat.service';

@Component({
    selector: 'app-chat-page',
    imports: [ChatContainerComponent],
    templateUrl: './chat-page.component.html',
    styleUrl: './chat-page.component.scss',
})
export class ChatPageComponent implements OnInit {
    gameId: string;
    private chatService: ChatService = inject(ChatService);

    ngOnInit(): void {
        this.chatService.chatDetache.set(true);
    }
}

import { Injectable } from '@angular/core';
import { ChatMessage } from '@common/chat-message';

@Injectable({
    providedIn: 'root',
})
export class ChatService {
    roomMessages: ChatMessage[] = [];

    addMessage(roomMessage: ChatMessage) {
        const exists = this.roomMessages.some((msg) => msg.timestamp === roomMessage.timestamp && msg.text === roomMessage.text);
        if (!exists) {
            this.roomMessages.push(roomMessage);
        }
    }
}

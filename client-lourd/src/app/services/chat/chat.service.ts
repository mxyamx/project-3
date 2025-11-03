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

    // Sanitize message to explictely remove the id of the user and just keep the name
    sanitizeMessage(messageToSanitize: ChatMessage): ChatMessage {
        const INVISIBLE_SEPARATOR = '\u2063'; // from kotlin
        const sender = messageToSanitize.sender.split(INVISIBLE_SEPARATOR)[0];

        const sanitizedMessage = {
            ...messageToSanitize,
            sender,
        };

        return sanitizedMessage;
    }
}

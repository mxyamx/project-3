import { TestBed } from '@angular/core/testing';

import { ChatMessage } from '@common/chat-message';
import { ChatService } from './chat.service';

describe('ChatService', () => {
    let service: ChatService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(ChatService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should add a message to roomMessages array when addMessage is called', () => {
        const roomMessage = 'message 1';
        const chatMessage: ChatMessage = {
            sender: 'Alice',
            text: roomMessage,
            timestamp: new Date(),
        };
        service.addMessage(chatMessage);
        expect(service.roomMessages.length).toBe(1);
        expect(service.roomMessages).toContain(chatMessage);
    });

    it('should not add duplicate messages based on timestamp and text', () => {
        const duplicateMessage: ChatMessage = {
            sender: 'Alice',
            text: 'Hello!',
            timestamp: new Date(),
        };

        service.roomMessages = [duplicateMessage];

        service.addMessage(duplicateMessage);

        expect(service.roomMessages.length).toBe(1);
    });

    it('should add message if it is not a duplicate', () => {
        const existingMessage: ChatMessage = {
            sender: 'Alice',
            text: 'Hello!',
            timestamp: new Date('2024-01-01T00:00:00Z'),
        };
        const newMessage: ChatMessage = {
            sender: 'Alice',
            text: 'Hi again!',
            timestamp: new Date('2024-01-01T00:00:01Z'),
        };

        service.roomMessages = [existingMessage];

        service.addMessage(newMessage);

        expect(service.roomMessages.length).toBe(2);
        expect(service.roomMessages[1]).toEqual(newMessage);
    });
});

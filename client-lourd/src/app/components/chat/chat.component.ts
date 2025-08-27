import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, Input, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAX_LENGTH_MESSAGE } from '@app/constants/objects-constants';
import { ChatService } from '@app/services/chat/chat.service';
import { CurrentGameManagerService } from '@app/services/current-game-manager/current-game-manager.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { ChatMessage } from '@common/chat-message';
import { Player } from '@common/player';

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './chat.component.html',
    styleUrl: './chat.component.scss',
})
export class ChatComponent implements OnInit {
    @Input() gameId: string | null;
    @ViewChild('scroll') private chatMessagesContainer: ElementRef;
    player: Player;

    messageInput: string = '';

    chatService = inject(ChatService);
    private currentGameManager = inject(CurrentGameManagerService);
    private gameSessionManager = inject(GameSessionManagerService);
    private playerSocketService = inject(PlayerSocketService);

    ngOnInit() {
        const currentGame = this.currentGameManager.displayedCurrentGame?.();
        this.gameId = currentGame?.id ?? null;
        this.player = this.gameSessionManager.chosenPlayer();
        this.joinRoom();
        this.configureBaseSocketFeatures();
    }

    joinRoom() {
        if (this.gameId) {
            this.playerSocketService.emitJoinChatRoom(this.gameId);
        }
    }

    configureBaseSocketFeatures() {
        this.playerSocketService.onNewMessage((roomMessage: ChatMessage) => {
            this.chatService.addMessage(roomMessage);
            setTimeout(() => this.scrollToBottom(), 0);
        });
    }

    sendToRoom() {
        if (this.gameId && this.player && this.messageInput.trim().length !== 0) {
            this.messageInput = this.messageInput.trim();
            if (this.messageInput.length > MAX_LENGTH_MESSAGE) {
                this.messageInput = this.messageInput.substring(0, MAX_LENGTH_MESSAGE);
            }

            const chatMessage: ChatMessage = {
                sender: this.player.name,
                text: this.messageInput,
                timestamp: new Date(),
            };
            this.playerSocketService.emitSendMessage(this.gameId, chatMessage);
            this.messageInput = '';
        }
    }

    private scrollToBottom(): void {
        try {
            this.chatMessagesContainer.nativeElement.scrollTop = this.chatMessagesContainer.nativeElement.scrollHeight;
        } catch (err) {
            return;
        }
    }
}

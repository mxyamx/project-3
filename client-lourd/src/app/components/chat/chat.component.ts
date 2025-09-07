import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, Input, OnInit, signal, ViewChild, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MAX_LENGTH_MESSAGE } from '@app/constants/objects-constants';
import { ChatService } from '@app/services/chat/chat.service';
import { CurrentGameManagerService } from '@app/services/current-game-manager/current-game-manager.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { ChatMessage } from '@common/chat-message';
import { UrlPage } from '@common/enums/url-page';

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './chat.component.html',
    styleUrl: './chat.component.scss',
})
export class ChatComponent implements OnInit {
    @Input() gameId: string | null;
    @Input() isPopup: boolean = false;
    @ViewChild('scroll') private chatMessagesContainer: ElementRef;
    @Input() playerName: string | null = null;
    @Input() isGeneralChat: boolean = false;

    messageInput: string = '';
    isExpended: WritableSignal<boolean> = signal(true);

    chatService = inject(ChatService);
    private currentGameManager = inject(CurrentGameManagerService);
    private gameSessionManager = inject(GameSessionManagerService);
    private playerSocketService = inject(PlayerSocketService);
    private router = inject(Router);

    ngOnInit() {
        if (this.isGeneralChat) {
            this.playerName = 'playerNameFromAuth';
            this.isExpended.set(false);
            return;
        }

        const currentGame = this.currentGameManager.displayedCurrentGame?.();
        if (!this.gameId) this.gameId = currentGame?.id ?? null;
        if (!this.playerName) this.playerName = this.gameSessionManager.chosenPlayer().name;
        this.playerSocketService.onChatHistory((msgs) => {
            this.chatService.roomMessages = msgs;
            setTimeout(() => this.scrollToBottom(), 0);
        });
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
            console.log('getting');
            this.chatService.addMessage(roomMessage);
            setTimeout(() => this.scrollToBottom(), 0);
        });
    }

    sendToRoom() {
        if (this.isGeneralChat && this.playerName && this.messageInput.trim().length !== 0) {
            this.messageInput = this.messageInput.trim();
            if (this.messageInput.length > MAX_LENGTH_MESSAGE) {
                this.messageInput = this.messageInput.substring(0, MAX_LENGTH_MESSAGE);
            }

            const chatMessage: ChatMessage = {
                sender: this.playerName,
                text: this.messageInput,
                timestamp: new Date(),
            };
            console.log('sending');
            this.playerSocketService.emitSendGeneralMessage(chatMessage);
            this.messageInput = '';
            return;
        }
        if (this.gameId && this.playerName && this.messageInput.trim().length !== 0) {
            this.messageInput = this.messageInput.trim();
            if (this.messageInput.length > MAX_LENGTH_MESSAGE) {
                this.messageInput = this.messageInput.substring(0, MAX_LENGTH_MESSAGE);
            }

            const chatMessage: ChatMessage = {
                sender: this.playerName,
                text: this.messageInput,
                timestamp: new Date(),
            };
            console.log('sending');
            this.playerSocketService.emitSendMessage(this.gameId, chatMessage);
            this.messageInput = '';
        }
    }
    openChatPopup() {
        console.log('open chat');
        const tree = this.router.createUrlTree([UrlPage.Chat], { queryParams: { gameId: this.gameId, playerName: this.playerName } });
        const url = this.router.serializeUrl(tree);
        const base = `${location.origin}${location.pathname}`;
        const finalUrl = `${base}#${url.startsWith('/') ? url.slice(1) : url}`;

        console.log(`tree: ${tree}`);
        console.log(`url: ${url}`);
        console.log(`base: ${base}`);
        console.log(`finalUrl: ${finalUrl}`);

        const w = window.open(finalUrl, 'chatPopup', 'width=420,heigh=640,noopener');
        if (!w || w.closed) return;
    }

    onInputFocus(): void {
        if (!this.isGeneralChat && this.isExpended()) {
            return;
        }
        this.isExpended.set(true);
        if (!this.playerSocketService.isConnected()) {
            this.playerSocketService.connect();
        }
        this.playerSocketService.onChatHistory((msgs) => {
            this.chatService.roomMessages = msgs;
            setTimeout(() => this.scrollToBottom(), 0);
        });

        this.playerSocketService.emitJoinGeneralChat();
        this.playerSocketService.onNewGeneralMessage((roomMessage: ChatMessage) => {
            console.log('getting');
            this.chatService.addMessage(roomMessage);
            setTimeout(() => this.scrollToBottom(), 0);
        });
    }
    onInputBlur() {
        console.log('Input lost focus');
    }

    private scrollToBottom(): void {
        try {
            this.chatMessagesContainer.nativeElement.scrollTop = this.chatMessagesContainer.nativeElement.scrollHeight;
        } catch (err) {
            return;
        }
    }
}

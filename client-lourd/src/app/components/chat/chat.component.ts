import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, inject, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAX_LENGTH_MESSAGE } from '@app/constants/objects-constants';
import { ChatService } from '@app/services/chat/chat.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { UserManagerService } from '@app/services/user-manager/user-manager.service';
import { ChatMessage } from '@common/chat-message';

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './chat.component.html',
    styleUrl: './chat.component.scss',
})
export class ChatComponent implements OnInit, OnDestroy {
    @Input() roomId: string;
    @Input() chatName: string;
    @Input() isPopup: boolean = false;
    @Input() isExpended: boolean = false;
    @ViewChild('scroll') private chatMessagesContainer: ElementRef;
    @Output() closeChat: EventEmitter<void> = new EventEmitter<void>();
    playerName: string = '';
    messageInput: string = '';

    chatService = inject(ChatService);
    private playerSocketService = inject(PlayerSocketService);
    private userManager = inject(UserManagerService);
    // private router = inject(Router);
    // private chatDockService = inject(ChatDockService);

    ngOnInit() {
        this.playerName = this.userManager.getCurrentUser().username;

        if (!this.playerSocketService.isConnected()) {
            this.playerSocketService.connect();
        }
        this.playerSocketService.onChatHistory((msgs) => {
            this.chatService.roomMessages = msgs;
            setTimeout(() => this.scrollToBottom(), 0);
        });

        this.joinRoom();
        this.configureBaseSocketFeatures();
    }

    ngOnDestroy(): void {
        this.playerSocketService.unsuscribeChat();
    }

    joinRoom() {
        if (this.roomId) {
            this.playerSocketService.emitJoinChatRoom(this.roomId);
        }
    }

    configureBaseSocketFeatures() {
        this.playerSocketService.onNewMessage((roomMessage: ChatMessage) => {
            this.chatService.addMessage(roomMessage);
            setTimeout(() => this.scrollToBottom(), 0);
        });
    }

    sendToRoom() {
        if (this.playerName && this.messageInput.trim().length !== 0) {
            this.messageInput = this.messageInput.trim();
            if (this.messageInput.length > MAX_LENGTH_MESSAGE) {
                this.messageInput = this.messageInput.substring(0, MAX_LENGTH_MESSAGE);
            }

            const chatMessage: ChatMessage = {
                sender: this.playerName,
                text: this.messageInput,
                timestamp: new Date(),
            };
            this.playerSocketService.emitSendMessage(this.roomId, chatMessage);
            this.messageInput = '';
        }
    }
    openChatPopup() {
        // const tree = this.router.createUrlTree([UrlPage.Chat], { queryParams: { gameId: this.roomId, playerName: this.playerName } });
        // const url = this.router.serializeUrl(tree);
        // const base = `${location.origin}${location.pathname}`;
        // const finalUrl = `${base}#${url.startsWith('/') ? url.slice(1) : url}`;
        // const w = window.open(finalUrl, 'chatPopup', 'width=420,heigh=640,noopener');
        // if (!w || w.closed) return;
    }

    private scrollToBottom(): void {
        try {
            this.chatMessagesContainer.nativeElement.scrollTop = this.chatMessagesContainer.nativeElement.scrollHeight;
        } catch (err) {
            return;
        }
    }
}

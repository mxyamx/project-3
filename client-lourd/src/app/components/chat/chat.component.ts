import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, Input, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MAX_LENGTH_MESSAGE } from '@app/constants/objects-constants';
import { ChatService } from '@app/services/chat/chat.service';
import { CurrentGameManagerService } from '@app/services/current-game-manager/current-game-manager.service';
import { GameSessionManagerService } from '@app/services/game-session-manager/game-session-manager.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { ChatMessage } from '@common/chat-message';
import { UrlPage } from '@common/enums/url-page';
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
    @Input() isPopup: boolean = false;
    @ViewChild('scroll') private chatMessagesContainer: ElementRef;
    @Input() player: Player | null = null;

    messageInput: string = '';

    chatService = inject(ChatService);
    private currentGameManager = inject(CurrentGameManagerService);
    private gameSessionManager = inject(GameSessionManagerService);
    private playerSocketService = inject(PlayerSocketService);
    private router = inject(Router);

    ngOnInit() {
        const currentGame = this.currentGameManager.displayedCurrentGame?.();
        if (!this.gameId) this.gameId = currentGame?.id ?? null;
        if (!this.player) this.player = this.gameSessionManager.chosenPlayer();
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
            console.log('sending');
            this.playerSocketService.emitSendMessage(this.gameId, chatMessage);
            this.messageInput = '';
        }
    }
    openChatPopup() {
        console.log('open chat');
        const tree = this.router.createUrlTree([UrlPage.Chat], { queryParams: { gameId: this.gameId, playerName: this.player?.name } });
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

    private scrollToBottom(): void {
        try {
            this.chatMessagesContainer.nativeElement.scrollTop = this.chatMessagesContainer.nativeElement.scrollHeight;
        } catch (err) {
            return;
        }
    }
}

import { CommonModule } from '@angular/common';
import {
    AfterViewChecked,
    Component,
    ElementRef,
    EventEmitter,
    inject,
    Input,
    OnDestroy,
    OnInit,
    Output,
    signal,
    ViewChild,
    WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAX_LENGTH_MESSAGE } from '@app/constants/objects-constants';
import { ChatMessageContext, PopupChatContext } from '@app/interfaces/popup-chat-context';
import { ChatService } from '@app/services/chat/chat.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { PopupChatBridgeService } from '@app/services/popup-chat-bridge/popup-chat-bridge.service';
import { UserManagerService } from '@app/services/user-manager/user-manager.service';
import { ChatMessage } from '@common/chat-message';
import { CHANNEL_GENERAL_ID, GAME_ROOM_REGEX } from '@common/constants/chat.constants';
import { TranslatePipe } from '@ngx-translate/core';
import { LoadingComponent } from '../loading/loading.component';

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslatePipe, LoadingComponent],
    templateUrl: './chat.component.html',
    styleUrl: './chat.component.scss',
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
    @Input() roomId: string;
    @Input() chatName: string;
    @Input() isPopup: boolean = false;
    @ViewChild('scroll') private chatMessagesContainer: ElementRef;
    @ViewChild('input') input!: ElementRef;
    @Output() closeChat: EventEmitter<void> = new EventEmitter<void>();
    @Output() openPopup: EventEmitter<PopupChatContext> = new EventEmitter<PopupChatContext>();
    needScroll = false;
    playerName: string = '';
    playerId: string = '';
    messageInput: string = '';
    nCharacters: WritableSignal<number> = signal(0);
    isLoading: WritableSignal<boolean> = signal(false);
    channelDeleted: WritableSignal<boolean> = signal(false);
    maxNCharacters: number = MAX_LENGTH_MESSAGE;

    chatService = inject(ChatService);
    private popupChatBridgeService = inject(PopupChatBridgeService);
    private playerSocketService = inject(PlayerSocketService);
    userManager = inject(UserManagerService);
    readonly gameRoomRegex = GAME_ROOM_REGEX;
    readonly channelGeneralId = CHANNEL_GENERAL_ID;

    ngOnInit() {
        this.isLoading.set(true);
        if (this.chatService.chatDetache()) {
            this.popupChatBridgeService.onChatOnInit((context) => {
                this.userManager.setId(context?.userId);
                this.userManager.setUsername(context?.username);
                this.playerId = context?.userId;
                this.playerName = context?.username;
                return;
            });
            this.popupChatBridgeService.onChatHistory((messages) => {
                this.chatService.roomMessages = messages;
                this.needScroll = true;
                this.isLoading.set(false);
                return;
            });
            this.popupChatBridgeService.onNewMessage((msg) => {
                this.chatService.addMessage(msg);
                this.needScroll = true;
                return;
            });
            this.popupChatBridgeService.onChannelDeleted(() => {
                this.channelDeleted.set(true);
                this.isLoading.set(false);
                return;
            });

            this.popupChatBridgeService.sendChatOnInit(this.roomId);
            return;
        }
        this.playerName = this.userManager.getCurrentUser().username;
        this.playerId = this.userManager.getCurrentUser().id;

        this.joinRoom();
        this.configureBaseSocketFeatures();
        this.chatService.markChannelAsRead(this.roomId);
    }

    ngAfterViewChecked() {
        if (this.needScroll) {
            this.needScroll = false;
            this.scrollToBottom();
        }
    }

    ngOnDestroy(): void {
        if (this.chatService.chatDetache()) {
            this.popupChatBridgeService.sendChatOnDestroy(this.roomId);
            return;
        }

        this.playerSocketService.unsubscribeChat();
        if (this.roomId) {
            this.playerSocketService.emitLeaveChatRoom(this.roomId);
        }
    }

    joinRoom() {
        if (this.roomId) {
            this.playerSocketService.emitJoinChatRoom(this.roomId, (response) => {
                if (response.roomDeleted) {
                    this.channelDeleted.set(true);
                    this.isLoading.set(false);
                    return;
                }

                this.chatService.roomMessages = response.history;
                this.needScroll = true;
                this.isLoading.set(false);
                this.chatService.markChannelAsRead(this.roomId);
            });
        }
    }

    configureBaseSocketFeatures() {
        this.playerSocketService.onNewMessage((roomMessage: ChatMessage) => {
            this.chatService.addMessage(roomMessage);
            this.needScroll = true;
        });
        this.playerSocketService.onChannelDeleted((response: { channelId: string }) => {
            if (response.channelId === this.roomId) {
                this.channelDeleted.set(true);
                this.isLoading.set(false);
            }
        });
    }

    sendToRoom() {
        const msg = this.messageInput.trim();
        if (this.playerName && msg.length > 0 && msg.length <= MAX_LENGTH_MESSAGE) {
            const user = this.userManager.getCurrentUser();

            const chatMessage: ChatMessage = {
                text: msg,
                sender: user.username,
                senderId: user.id,
                timestamp: '',
            };
            if (this.chatService.chatDetache()) {
                const context: ChatMessageContext = { message: chatMessage, roomId: this.roomId };
                this.popupChatBridgeService.sendMessage(context);
            } else {
                this.playerSocketService.emitSendMessage(this.roomId, chatMessage);
            }
            this.messageInput = '';
            this.nCharacters.set(0);
            this.input.nativeElement.focus();
        }
    }

    private scrollToBottom(): void {
        this.needScroll = false;
        try {
            this.chatMessagesContainer.nativeElement.scrollTop = this.chatMessagesContainer.nativeElement.scrollHeight;
        } catch (err) {
            return;
        }
    }

    onModelChange(textValue: string): void {
        this.nCharacters.set(textValue.length);
    }

    isMine(message: ChatMessage): boolean {
        const currentUser = this.userManager.getCurrentUser();
        return message.senderId === currentUser.id;
    }

    openChatPopup(): void {
        if (this.isPopup) return;
        const context: PopupChatContext = { openChat: true, channelId: this.roomId, channelName: this.chatName };
        this.openPopup.emit(context);
    }
}
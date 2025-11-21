import { Component, inject, Input, OnInit, signal, ViewChild, WritableSignal } from '@angular/core';
import { PopupChatContext } from '@app/interfaces/popup-chat-context';
import { ChatService } from '@app/services/chat/chat.service';
import { PopupChatBridgeService } from '@app/services/popup-chat-bridge/popup-chat-bridge.service';
import { ChannelSummary } from '@common/channel';
import { CHANNEL_GAME_NAME, CHANNEL_GENERAL_ID, CHANNEL_GENERAL_NAME } from '@common/constants/chat.constants';
import { ChannelNavigatorComponent } from '../channel-navigator/channel-navigator.component';
import { ChatComponent } from '../chat/chat.component';

@Component({
    selector: 'app-chat-container',
    standalone: true,
    imports: [ChatComponent, ChannelNavigatorComponent],
    templateUrl: './chat-container.component.html',
    styleUrl: './chat-container.component.scss',
})
export class ChatContainerComponent implements OnInit {
    @Input() gameId: string | null = null;
    @Input() isPopup: boolean = false;
    @ViewChild(ChannelNavigatorComponent) channelComponent!: ChannelNavigatorComponent;
    showChannelNavigator: WritableSignal<boolean> = signal(true);
    channelId: string = CHANNEL_GENERAL_ID;
    channelName: string = CHANNEL_GENERAL_NAME;

    gameChannel: ChannelSummary | null = null;
    private chatService: ChatService = inject(ChatService);
    private popupChatBridgeService: PopupChatBridgeService = inject(PopupChatBridgeService);
    ngOnInit(): void {
        if (this.gameId) {
            this.gameChannel = {
                id: `GAME-${this.gameId}`,
                name: CHANNEL_GAME_NAME,
                createdAt: new Date(),
                isAdmin: false,
                isManageable: false,
                memberCount: 0,
            };
        }

        if (this.chatService.chatDetache()) {
            this.popupChatBridgeService.onInitContext((context) => {
                if (context?.gameChannel) {
                    this.gameId = context?.gameChannel.id.split('-')[1];
                    this.gameChannel = context?.gameChannel;
                }
                if (context?.openChat) {
                    this.channelId = context?.channelId;
                    this.channelName = context?.channelName;
                    this.showChannelNavigator.set(false);
                    return;
                }
                this.channelComponent.initJoinedChannels();
                return;
            });

            this.popupChatBridgeService.onJoinGameChat((roomId) => {
                if (roomId) {
                    this.gameId = roomId;
                    this.gameChannel = {
                        id: `GAME-${roomId}`,
                        name: CHANNEL_GAME_NAME,
                        createdAt: new Date(),
                        isAdmin: false,
                        isManageable: false,
                        memberCount: 0,
                    };
                    if (this.showChannelNavigator()) {
                        this.channelComponent.initJoinedChannels();
                    }
                }
                return;
            });

            this.popupChatBridgeService.onLeaveGameChat((roomId) => {
                if (!this.gameChannel || !this.gameId) {
                    this.gameChannel = null;
                    this.gameId = null;
                    return;
                }
                if (roomId && roomId === this.gameId && this.gameChannel.id === `GAME-${roomId}`) {
                    this.gameChannel = null;
                    this.gameId = null;
                    if (!this.showChannelNavigator() && this.channelId === `GAME-${roomId}`) {
                        this.channelId = '';
                        this.channelName = '';
                        this.showChannelNavigator.set(true);
                        return;
                    }
                    this.channelComponent.initJoinedChannels();
                }
                return;
            });
        }
    }

    openChat(channel: ChannelSummary) {
        this.channelId = channel.id;
        this.channelName = channel.name;
        this.showChannelNavigator.set(false);
    }

    closeChat(): void {
        this.showChannelNavigator.set(true);
    }

    openPopup(context: PopupChatContext): void {
        let updatedContext: PopupChatContext = { ...context };
        if (this.gameChannel) {
            updatedContext = { ...updatedContext, gameChannel: this.gameChannel };
        }
        this.chatService.detachChat(updatedContext);
    }
}

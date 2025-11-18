import { ChannelSummary } from '@common/channel';
import { ChatMessage } from '@common/chat-message';

export interface PopupChatContext {
    openChat: boolean;
    channelId: string;
    channelName: string;
    gameChannel?: ChannelSummary;
}

export interface ChatOnInitContext {
    userId: string;
    username: string;
}

export interface ChatMessageContext {
    message: ChatMessage;
    roomId: string;
}

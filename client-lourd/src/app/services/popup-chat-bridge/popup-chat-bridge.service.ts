import { Injectable } from '@angular/core';
import { ChatMessageContext } from '@app/interfaces/popup-chat-context';

type IpcRenderer = {
    send: (channel: string, ...args: any[]) => void;
    on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
};

@Injectable({ providedIn: 'root' })
export class PopupChatBridgeService {
    private ipc?: IpcRenderer;

    constructor() {
        this.initIpc();
    }

    private initIpc() {
        try {
            const w = window as any;
            if (w && w.require) {
                const { ipcRenderer } = w.require('electron');
                this.ipc = ipcRenderer;
            }
        } catch (e) {
            console.warn('IPC non dispo dans popup (mode web ?)', e);
        }
    }

    sendChatOnInit(roomId: any): void {
        this.ipc?.send('popup:request-chat-on-init', roomId);
    }

    sendChannelOnInit(): void {
        this.ipc?.send('popup:request-channel-on-init');
    }
    sendChatOnDestroy(roomId: any): void {
        this.ipc?.send('popup:request-chat-on-destroy', roomId);
    }

    sendChannelOnDestroy(): void {
        this.ipc?.send('popup:request-channel-on-destroy');
    }

    openPopupFromMainWindow(): void {
        this.ipc?.send('popup:open');
    }

    requestChannels(): void {
        this.ipc?.send('popup:request-channels');
    }

    onChannels(cb: (channels: any[]) => void): void {
        this.ipc?.on('popup:channels', (_event, channels) => cb(channels));
    }
    onChannelDeleted(cb: () => void): void {
        this.ipc?.on('popup:channel-deleted', () => cb());
    }
    onChannelRemoved(cb: (channelId: any) => void): void {
        this.ipc?.on('popup:channel-removed', (_event, channelId) => cb(channelId));
    }
    onJoinGameChat(cb: (roomId: any) => void): void {
        this.ipc?.on('popup:join-game-chat', (_event, roomId) => cb(roomId));
    }
    onLeaveGameChat(cb: (roomId: any) => void): void {
        this.ipc?.on('popup:leave-game-chat', (_event, roomId) => cb(roomId));
    }

    onSearchChannels(cb: (channels: any[]) => void): void {
        this.ipc?.on('popup:search-channels', (_event, channels) => cb(channels));
    }
    requestSearchChannels(input: string): void {
        this.ipc?.send('popup:request-search-channels', input);
    }

    requestCreate(name: string): void {
        this.ipc?.send('popup:request-create-channel', name);
    }

    requestDelete(id: string): void {
        this.ipc?.send('popup:request-delete-channel', id);
    }

    requestLeave(id: string): void {
        this.ipc?.send('popup:request-leave-channel', id);
    }

    requestJoin(id: string): void {
        this.ipc?.send('popup:request-join-channel', id);
    }

    onServerError(cb: (data: any) => void): void {
        this.ipc?.on('popup:server-error', (_event, data) => cb(data));
    }

    onChatOnInit(cb: (context: any) => void): void {
        this.ipc?.on('popup:chat-on-init-context', (_event, context) => cb(context));
    }

    onChatHistory(cb: (messages: any[]) => void): void {
        this.ipc?.on('popup:chat-history', (_event, messages) => cb(messages));
    }

    sendMessage(context: ChatMessageContext): void {
        this.ipc?.send('popup:send-message', context);
    }

    onNewMessage(cb: (msg: any) => void): void {
        this.ipc?.on('popup:new-message', (_event, msg) => cb(msg));
    }

    onInitContext(cb: (context: any) => void): void {
        this.ipc?.on('popup:init-context', (_event, context) => cb(context));
    }
}

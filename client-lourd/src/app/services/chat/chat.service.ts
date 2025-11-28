import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal, computed } from '@angular/core';
import { SERVER_ERROR_CONFIRM_DIALOG_DATA } from '@app/constants/channel-constants';
import { ConfirmationDialogData } from '@app/interfaces/confirmation-dialog-date';
import { ChatOnInitContext, PopupChatContext } from '@app/interfaces/popup-chat-context';
import { Channel } from '@common/channel';
import { ChatMessage } from '@common/chat-message';
import { firstValueFrom } from 'rxjs';
import { ChannelService } from '../channel/channel.service';
import { PlayerSocketService } from '../player-socket/player-socket.service';
import { UserManagerService } from '../user-manager/user-manager.service';

type IpcRenderer = {
    send: (channel: string, ...args: any[]) => void;
    on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
    removeAllListeners: (channel: string) => void;
};

@Injectable({
    providedIn: 'root',
})
export class ChatService {
    private ipc?: IpcRenderer;
    roomMessages: ChatMessage[] = [];
    chatDetache = signal(false);
    unreadChannels = signal<Map<string, number>>(new Map());
    private notificationAudio: HTMLAudioElement | null = null;
    private notificationsInitialized = false;
    showChat = signal(false);

    private userManager = inject(UserManagerService);
    private playerSocketService = inject(PlayerSocketService);
    private channelService = inject(ChannelService);

    totalUnreadCount = computed(() => {
        let total = 0;
        this.unreadChannels().forEach((count) => {
            total += count;
        });
        return total;
    });

    constructor() {
        this.initIpc();
    }

    initNotificationListener(): void {
        if (this.notificationsInitialized) return;
        this.notificationsInitialized = true;

        this.playerSocketService.onChatNotification((data) => {
            const currentUserId = this.userManager.getCurrentUser().id;

            
            if (data.message.senderId === currentUserId) return;

           
            if (data.targetUserId && data.targetUserId !== currentUserId) return;

          
            this.incrementUnreadForChannel(data.roomId);

            
            if (!this.showChat()) {
                this.playNotificationSound();
            }
        });
    }

    addMessage(roomMessage: ChatMessage) {
        const exists = this.roomMessages.some((msg) => msg.timestamp === roomMessage.timestamp && msg.text === roomMessage.text);
        if (!exists) {
            this.roomMessages.push(roomMessage);
        }
    }

    private initIpc() {
        try {
            const w = window as any;
            if (w && w.require) {
                const { ipcRenderer } = w.require('electron');
                this.ipc = ipcRenderer;

                ipcRenderer.on('main:get-channels', async () => {
                    try {
                        const channels = await firstValueFrom(this.channelService.getMyChannels());
                        ipcRenderer.send('main:reply-channels', channels);
                    } catch (err: unknown) {
                        this.handleServerError(err);
                    }
                });

                ipcRenderer.on('main:get-search-channels', async (_event: any, input: any) => {
                    try {
                        const channels = await firstValueFrom(this.channelService.searchChannelsByPattern(input));
                        ipcRenderer.send('main:reply-search-channels', channels);
                    } catch (err: unknown) {
                        this.handleServerError(err);
                    }
                });

                ipcRenderer.on('main:create-channel', async (_event: any, name: any) => {
                    try {
                        const channel: Channel = { id: '', name: name, createdAt: new Date() };
                        await firstValueFrom(this.channelService.createChannel(channel));
                        try {
                            const channels = await firstValueFrom(this.channelService.getMyChannels());
                            ipcRenderer.send('main:reply-channels', channels);
                        } catch (err: unknown) {
                            this.handleServerError(err);
                        }
                    } catch (err: unknown) {
                        this.handleServerError(err);
                    }
                });

                ipcRenderer.on('main:delete-channel', async (_event: any, id: any) => {
                    try {
                        await firstValueFrom(this.channelService.deleteChannel(id));
                        try {
                            const channels = await firstValueFrom(this.channelService.getMyChannels());
                            ipcRenderer.send('main:reply-channels', channels);
                        } catch (err: unknown) {
                            this.handleServerError(err);
                        }
                    } catch (err: unknown) {
                        this.handleServerError(err);
                    }
                });

                ipcRenderer.on('main:leave-channel', async (_event: any, id: any) => {
                    try {
                        await firstValueFrom(this.channelService.leaveChannel(id));
                        try {
                            const channels = await firstValueFrom(this.channelService.getMyChannels());
                            ipcRenderer.send('main:reply-channels', channels);
                        } catch (err: unknown) {
                            this.handleServerError(err);
                        }
                    } catch (err: unknown) {
                        this.handleServerError(err);
                    }
                });

                ipcRenderer.on('main:join-channel', async (_event: any, id: any) => {
                    try {
                        await firstValueFrom(this.channelService.joinChannel(id));
                        try {
                            const channels = await firstValueFrom(this.channelService.getMyChannels());
                            ipcRenderer.send('main:reply-channels', channels);
                        } catch (err: unknown) {
                            this.handleServerError(err);
                        }
                    } catch (err: unknown) {
                        this.handleServerError(err);
                    }
                });

                ipcRenderer.on('main:send-message-from-popup', (_event: any, context: any) => {
                    this.playerSocketService.emitSendMessage(context?.roomId, context?.message);
                });

                ipcRenderer.on('main:set-chat-on-init', (_event: any, roomId: any) => {
                    this.chatOnInit(roomId);
                });

                ipcRenderer.on('main:set-channel-on-init', (_event: any, roomId: any) => {
                    this.channelOnInit();
                });

                ipcRenderer.on('main:set-chat-on-destroy', (_event: any, roomId: any) => {
                    this.chatOnDestroy(roomId);
                });
                ipcRenderer.on('main:set-channel-on-destroy', () => {
                    this.channelOnDestroy();
                });

                ipcRenderer.on('popup:closed', () => {
                    this.chatDetache.set(false);
                });
            }
        } catch (e) {
            console.warn('IPC non dispo (mode web ?)', e);
        }
    }

    playNotificationSound(): void {
        if (!this.notificationAudio) {
            this.notificationAudio = new Audio('assets/sounds/notification.mp3');
            this.notificationAudio.volume = 0.5;
        }
        this.notificationAudio.currentTime = 0;
        this.notificationAudio.play().catch((err) => {
            console.warn('Audio play failed:', err);
        });
    }

    incrementUnreadForChannel(channelId: string): void {
        this.unreadChannels.update((map) => {
            const newMap = new Map(map);
            const current = newMap.get(channelId) || 0;
            newMap.set(channelId, current + 1);
            return newMap;
        });
    }

    markChannelAsRead(channelId: string): void {
        this.unreadChannels.update((map) => {
            const newMap = new Map(map);
            newMap.delete(channelId);
            return newMap;
        });
    }

    getUnreadCountForChannel(channelId: string): number {
        return this.unreadChannels().get(channelId) || 0;
    }

    private handleServerError(err: unknown) {
        let serverKey = 'unknown';

        if (err instanceof HttpErrorResponse) {
            const payload = err.error;

            if (payload && typeof payload === 'object' && 'error' in payload) {
                serverKey = (payload as { error: string }).error;
            }
        }

        const i18nKey = `dialog.server-error.server-errors.${serverKey}`;

        const data: ConfirmationDialogData = {
            ...SERVER_ERROR_CONFIRM_DIALOG_DATA,
            text: i18nKey,
        };

        this.ipc?.send('main:server-error', data);
    }

    chatOnInit(roomId: string) {
        const username = this.userManager.getCurrentUser().username;
        const userId = this.userManager.getCurrentUser().id;

        this.playerSocketService.onChannelDeleted((response: { channelId: string }) => {
            if (response.channelId === roomId) {
                this.ipc?.send('main:channel-deleted');
                return;
            }
        });

        this.playerSocketService.emitJoinChatRoom(roomId, (response) => {
            if (response.roomDeleted) {
                this.ipc?.send('main:channel-deleted');
                return;
            }
            this.ipc?.send('main:send-chat-history', response.history);
        });

        this.playerSocketService.onNewMessage((roomMessage: ChatMessage) => {
            this.addMessage(roomMessage);
            this.ipc?.send('main:new-message', roomMessage);
        });
        const context: ChatOnInitContext = { userId, username };
        this.ipc?.send('main:send-chat-on-init-done', context);
    }

    chatOnDestroy(roomId: string) {
        this.playerSocketService.unsubscribeChat();
        this.playerSocketService.emitLeaveChatRoom(roomId);
    }

    channelOnDestroy() {
        this.playerSocketService.unsubscribeChannel();
    }

    channelOnInit(): void {
        this.playerSocketService.onChannelRemoved(({ channelId }) => {
            this.ipc?.send('main:channel-removed', channelId);
        });
    }

    detachChat(context: PopupChatContext): void {
        this.chatDetache.set(true);

        if (this.ipc) {
            this.ipc.send('popup:open', context);
        } else {
            console.warn('detachChat() sans ipcRenderer (pas d\'Electron)');
        }
    }

    closePopup(): void {
        this.chatDetache.set(false);
        this.ipc?.send('popup:close');
    }

    joinGameChat(gamedId: string): void {
        this.ipc?.send('main:join-game-chat', gamedId);
    }

    leaveGameChat(gamedId: string): void {
        this.ipc?.send('main:leave-game-chat', gamedId);
    }
}
import { inject, Injectable, signal } from '@angular/core';
import { ChatOnInitContext, PopupChatContext } from '@app/interfaces/popup-chat-context';
import { ChatMessage } from '@common/chat-message';
import { PlayerSocketService } from '../player-socket/player-socket.service';
import { UserManagerService } from '../user-manager/user-manager.service';

type IpcRenderer = {
    send: (channel: string, ...args: any[]) => void;
    on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
};

@Injectable({
    providedIn: 'root',
})
export class ChatService {
    private ipc?: IpcRenderer;
    roomMessages: ChatMessage[] = [];
    chatDetache = signal(false);
    private userManager = inject(UserManagerService);
    private playerSocketService = inject(PlayerSocketService);

    popupContext = signal<PopupChatContext | null>(null);

    constructor() {
        this.initIpc();
    }

    addMessage(roomMessage: ChatMessage) {
        const exists = this.roomMessages.some((msg) => msg.timestamp === roomMessage.timestamp && msg.text === roomMessage.text);
        if (!exists) {
            this.roomMessages.push(roomMessage);
        }
    }

    private initIpc() {
        try {
            console.log('window.require =', (window as any).require);
            const w = window as any;
            if (w && w.require) {
                const { ipcRenderer } = w.require('electron');
                this.ipc = ipcRenderer;

                ipcRenderer.on('main:get-channels', async () => {
                    const channels = await this.getChannelsFromAngular();
                    ipcRenderer.send('main:reply-channels', channels);
                });

                ipcRenderer.on('main:send-message-from-popup', (_event: any, context: any) => {
                    this.playerSocketService.emitSendMessage(context?.roomId, context?.message);
                });

                ipcRenderer.on('main:set-chat-on-init', (_event: any, roomId: any) => {
                    this.chatOnInit(roomId);
                });

                ipcRenderer.on('popup:closed', () => {
                    this.chatDetache.set(false);
                });
            }
        } catch (e) {
            console.warn('IPC non dispo (mode web ?)', e);
        }
    }

    chatOnInit(roomId: string) {
        const username = this.userManager.getCurrentUser().username;
        const userId = this.userManager.getCurrentUser().id;

        this.playerSocketService.onChatHistory((msgs) => {
            console.log('onChatHistory');
            this.roomMessages = msgs;
            console.log(msgs[0]);
            this.ipc?.send('main:send-chat-history', msgs);
        });

        this.playerSocketService.emitJoinChatRoom(roomId);

        this.playerSocketService.onNewMessage((roomMessage: ChatMessage) => {
            console.log('onNewmessage');
            console.log(roomMessage);
            this.addMessage(roomMessage);
            this.ipc?.send('main:new-message', roomMessage);
        });
        const context: ChatOnInitContext = { userId, username };
        this.ipc?.send('main:send-chat-on-init-done', context);
    }

    private async getChannelsFromAngular(): Promise<any[]> {
        // ici tu appelles ton ChannelService Angular
        // return await firstValueFrom(this.channelService.getMyChannels());
        return [
            { id: '1', name: 'general' },
            { id: '2', name: 'dev' },
        ];
    }

    // Quand TON chat Angular (main window) reçoit un message du serveur,
    // tu broadcast au popup en passant par le main process :
    public notifyNewMessageToPopup(message: any) {
        this.ipc?.send('main:new-message', message);
    }

    detachChat(context: PopupChatContext): void {
        this.chatDetache.set(true);
        this.popupContext.set(context);

        if (this.ipc) {
            this.ipc.send('popup:open', context);
        } else {
            console.warn('detachChat() sans ipcRenderer (pas d’Electron)');
        }
    }
}

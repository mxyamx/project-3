import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, inject, Input, OnDestroy, OnInit, Output, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import {
    DELETE_CHANNEL_CONFIRM_DIALOG_DATA,
    JOIN_CHANNEL_CONFIRM_DIALOG_DATA,
    LEAVE_CHANNEL_CONFIRM_DIALOG_DATA,
    SERVER_ERROR_CONFIRM_DIALOG_DATA,
} from '@app/constants/channel-constants';
import { ChannelTab } from '@app/enums/channel-tab';
import { ConfirmationDialogData } from '@app/interfaces/confirmation-dialog-date';
import { PopupChatContext } from '@app/interfaces/popup-chat-context';
import { ChannelService } from '@app/services/channel/channel.service';
import { ChatService } from '@app/services/chat/chat.service';
import { PlayerSocketService } from '@app/services/player-socket/player-socket.service';
import { PopupChatBridgeService } from '@app/services/popup-chat-bridge/popup-chat-bridge.service';
import { Channel, ChannelSummary } from '@common/channel';
import { CHANNEL_GENERAL_ID, GAME_ROOM_REGEX } from '@common/constants/chat.constants';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom, take } from 'rxjs';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { CreateChannelDialogComponent } from '../create-channel-dialog/create-channel-dialog.component';
import { LoadingComponent } from '../loading/loading.component';

@Component({
    selector: 'app-channel-navigator',
    standalone: true,
    imports: [CommonModule, FormsModule, LoadingComponent, TranslatePipe],
    templateUrl: './channel-navigator.component.html',
    styleUrl: './channel-navigator.component.scss',
})
export class ChannelNavigatorComponent implements OnInit, OnDestroy {
    @Input() isPopup: boolean = false;
    @Input() gameChannel: ChannelSummary | null = null;
    @Output() openChat: EventEmitter<ChannelSummary> = new EventEmitter<ChannelSummary>();
    @Output() openPopup: EventEmitter<PopupChatContext> = new EventEmitter<PopupChatContext>();
    selectedTab: WritableSignal<ChannelTab> = signal(ChannelTab.Joined);
    ChannelTab = ChannelTab;
    searchInput = '';
    isLoading: WritableSignal<boolean> = signal(false);
    channelRemovedMessage: WritableSignal<string | null> = signal(null);

    joinedChannels: ChannelSummary[] = [];
    filteredJoinedChannels: ChannelSummary[] = [];
    directoryChannels: Channel[] = [];

    readonly dialog = inject(MatDialog);
    readonly gameRoomRegex = GAME_ROOM_REGEX;
    readonly channelGeneralId = CHANNEL_GENERAL_ID;
    private translateService = inject(TranslateService);
    private channelService = inject(ChannelService);
    private chatService: ChatService = inject(ChatService);
    private popupChatBridgeService = inject(PopupChatBridgeService);
    private playerSocketService = inject(PlayerSocketService);
    private translate = inject(TranslateService);

    async ngOnInit(): Promise<void> {
        if (this.chatService.chatDetache()) {
            this.popupChatBridgeService.onServerError((data: any) => {
                this.isLoading.set(false);
                if (this.instanceOfConfirmationDialogData(data)) {
                    this.openConfirm(data);
                } else {
                    this.openConfirm(SERVER_ERROR_CONFIRM_DIALOG_DATA);
                }
            });
            this.popupChatBridgeService.onChannels((channels) => {
                let result = channels;
                if (this.gameChannel) {
                    const alreadyPresent = channels.some((ch) => {
                        if (this.gameChannel) {
                            ch.id === this.gameChannel.id;
                        }
                    });
                    if (!alreadyPresent) {
                        result = [...channels, this.gameChannel];
                    }
                }

                this.isLoading.set(false);
                this.joinedChannels = result;
                this.filteredJoinedChannels = [...result];
                this.resetSearchInput();
                return;
            });
            this.popupChatBridgeService.onSearchChannels((channels) => {
                this.directoryChannels = channels;
                this.isLoading.set(false);
                return;
            });
        }
        await this.initJoinedChannels();
        if (this.chatService.chatDetache()) {
            this.popupChatBridgeService.onChannelRemoved((channelId) => {
                const removedChannel = this.joinedChannels.find((ch) => ch.id === channelId) ?? null;

                this.joinedChannels = this.joinedChannels.filter((ch) => ch.id !== channelId);
                this.filteredJoinedChannels = this.filteredJoinedChannels.filter((ch) => ch.id !== channelId);

                const msg = removedChannel
                    ? this.translate.instant('channels.deleted-with-name', { name: removedChannel.name })
                    : this.translate.instant('channels.deleted');

                this.channelRemovedMessage.set(msg);

                setTimeout(() => this.channelRemovedMessage.set(null), 3000);
                return;
            });
            this.popupChatBridgeService.sendChannelOnInit();
            return;
        }
        this.playerSocketService.onChannelRemoved(({ channelId }) => {
            const removedChannel = this.joinedChannels.find((ch) => ch.id === channelId) ?? null;

            this.joinedChannels = this.joinedChannels.filter((ch) => ch.id !== channelId);
            this.filteredJoinedChannels = this.filteredJoinedChannels.filter((ch) => ch.id !== channelId);

            const msg = removedChannel
                ? this.translate.instant('channels.deleted-with-name', { name: removedChannel.name })
                : this.translate.instant('channels.deleted');

            this.channelRemovedMessage.set(msg);

            setTimeout(() => this.channelRemovedMessage.set(null), 3000);
        });
    }

    ngOnDestroy(): void {
        if (this.chatService.chatDetache()) {
            this.popupChatBridgeService.sendChannelOnDestroy();
            return;
        }
        this.playerSocketService.unsubscribeChannel();
    }

    async searchChannel(): Promise<void> {
        if (!this.searchInput.trim()) {
            this.filteredJoinedChannels = this.joinedChannels;
            this.directoryChannels = [];
            return;
        }
        if (this.selectedTab() === ChannelTab.Joined) {
            let regex = new RegExp(this.searchInput.trim());
            this.filteredJoinedChannels = this.joinedChannels.filter((channel: ChannelSummary) => {
                const isGeneral = channel.id === this.channelGeneralId;
                const isGameChannel = this.gameRoomRegex.test(channel.id);
                if (isGameChannel || isGeneral) {
                    return this.translateService.instant(`chat.${channel.name}`).match(regex);
                }
                channel.name.match(regex);
            });
        } else {
            if (this.chatService.chatDetache()) {
                this.isLoading.set(true);
                this.popupChatBridgeService.requestSearchChannels(this.searchInput);
                return;
            }
            this.isLoading.set(true);
            try {
                const channels = await firstValueFrom(this.channelService.searchChannelsByPattern(this.searchInput));
                this.directoryChannels = channels;
            } catch (err: unknown) {
                this.openConfirm(this.handleServerError(err));
            } finally {
                this.isLoading.set(false);
            }
        }
    }

    async openCreateDialog(): Promise<void> {
        const ref = this.dialog.open(CreateChannelDialogComponent, {
            width: '420px',
            panelClass: 'cc-panel',
            backdropClass: 'cc-backdrop',
            autoFocus: 'first-tabbable',
            hasBackdrop: true,
            disableClose: false,
            closeOnNavigation: true,
        });

        const name = await firstValueFrom(ref.afterClosed().pipe(take(1)));
        if (name !== undefined && name !== '') {
            await this.createChannel(name);
        }
    }

    async createChannel(name: string): Promise<void> {
        const channel: Channel = { id: '', name: name, createdAt: new Date() };

        if (this.chatService.chatDetache()) {
            this.popupChatBridgeService.requestCreate(name);
            this.isLoading.set(true);
            return;
        }
        try {
            const newChannel: ChannelSummary = await firstValueFrom(this.channelService.createChannel(channel));

            this.joinedChannels.push(newChannel);
        } catch (err: unknown) {
            this.openConfirm(this.handleServerError(err));
        } finally {
            this.resetSearchInput();
        }
    }

    toggleTab(tab: ChannelTab): void {
        this.selectedTab.set(tab);
        this.searchInput = '';
        this.filteredJoinedChannels = this.joinedChannels;
        this.directoryChannels = [];
    }

    async deleteChannel(channelId: string): Promise<void> {
        const confirmed = await this.openConfirm(DELETE_CHANNEL_CONFIRM_DIALOG_DATA);
        if (!confirmed) {
            return;
        }

        if (this.chatService.chatDetache()) {
            this.isLoading.set(true);
            this.popupChatBridgeService.requestDelete(channelId);
            return;
        }
        try {
            this.isLoading.set(true);
            await firstValueFrom(this.channelService.deleteChannel(channelId));
        } catch (err: unknown) {
            this.openConfirm(this.handleServerError(err));
        } finally {
            this.isLoading.set(false);
            this.resetSearchInput();
            await this.initJoinedChannels();
        }
    }

    async leaveChannel(channelId: string): Promise<void> {
        const confirmed = await this.openConfirm(LEAVE_CHANNEL_CONFIRM_DIALOG_DATA);
        if (!confirmed) {
            return;
        }
        if (this.chatService.chatDetache()) {
            this.isLoading.set(true);
            this.popupChatBridgeService.requestLeave(channelId);
            return;
        }
        try {
            this.isLoading.set(true);
            await firstValueFrom(this.channelService.leaveChannel(channelId));
        } catch (err: unknown) {
            this.openConfirm(this.handleServerError(err));
        } finally {
            this.isLoading.set(false);
            this.resetSearchInput();
            await this.initJoinedChannels();
        }
    }

    openChannel(channel: ChannelSummary): void {
        this.openChat.emit(channel);
    }

    async joinChannel(channelId: string): Promise<void> {
        const data: ConfirmationDialogData = { ...JOIN_CHANNEL_CONFIRM_DIALOG_DATA };
        const confirmed = await this.openConfirm(data);
        if (!confirmed) {
            return;
        }
        if (this.chatService.chatDetache()) {
            this.isLoading.set(true);
            this.popupChatBridgeService.requestJoin(channelId);
            return;
        }
        try {
            await firstValueFrom(this.channelService.joinChannel(channelId));
        } catch (err: unknown) {
            this.openConfirm(this.handleServerError(err));
        } finally {
            this.resetSearchInput();
            await this.initJoinedChannels();
        }
    }

    getUnreadCount(channelId: string): number {
        return this.chatService.getUnreadCountForChannel(channelId);
    }

    private resetSearchInput(): void {
        this.searchInput = '';
        this.filteredJoinedChannels = this.joinedChannels;
        this.directoryChannels = [];
        this.selectedTab.set(ChannelTab.Joined);
    }

    private instanceOfConfirmationDialogData(object: any): object is ConfirmationDialogData {
        return 'confirmButtonLabel' in object;
    }

    async initJoinedChannels(): Promise<void> {
        if (this.chatService.chatDetache()) {
            this.isLoading.set(true);
            this.popupChatBridgeService.requestChannels();
            return;
        }
        this.isLoading.set(true);
        try {
            let channels = await firstValueFrom(this.channelService.getMyChannels());
            if (this.gameChannel) channels.push(this.gameChannel);
            this.joinedChannels = channels;
            this.filteredJoinedChannels = [...channels];
        } catch (err: unknown) {
            this.openConfirm(this.handleServerError(err));
        } finally {
            this.isLoading.set(false);
        }
    }

    private async openConfirm(data: ConfirmationDialogData): Promise<boolean> {
        const ref = this.dialog.open(ConfirmationDialogComponent, {
            width: '420px',
            panelClass: 'cc-panel',
            backdropClass: 'cc-backdrop',
            autoFocus: 'first-tabbable',
            disableClose: false,
            data: data,
        });

        const confirmed = await firstValueFrom(ref.afterClosed().pipe(take(1)));
        return confirmed;
    }

    openChannelPopup(): void {
        if (this.isPopup) return;
        const context: PopupChatContext = { openChat: false, channelId: '', channelName: '' };
        this.openPopup.emit(context);
    }

    private handleServerError(err: unknown): ConfirmationDialogData {
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
        return data;
    }
}
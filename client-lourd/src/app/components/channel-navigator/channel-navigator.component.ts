import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import {
    DELETE_CHANNEL_CONFIRM_DIALOG_DATA,
    JOIN_CHANNEL_CONFIRM_DIALOG_DATA,
    LEAVE_CHANNEL_CONFIRM_DIALOG_DATA,
} from '@app/constants/channel-constants';
import { ChannelTab } from '@app/enums/channel-tab';
import { ConfirmationDialogData } from '@app/interfaces/confirmation-dialog-date';
import { PopupChatContext } from '@app/interfaces/popup-chat-context';
import { ChannelService } from '@app/services/channel/channel.service';
import { ChatService } from '@app/services/chat/chat.service';
import { Channel, ChannelSummary } from '@common/channel';
import { CHANNEL_GENERAL_ID, CHANNEL_GENERAL_NAME, GAME_ROOM_REGEX } from '@common/constants/chat.constants';
import { TranslatePipe } from '@ngx-translate/core';
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
export class ChannelNavigatorComponent implements OnInit {
    @Input() isPopup: boolean = false;
    @Input() gameChannel: ChannelSummary | null = null;
    @Output() openChat: EventEmitter<ChannelSummary> = new EventEmitter<ChannelSummary>();
    @Output() openPopup: EventEmitter<PopupChatContext> = new EventEmitter<PopupChatContext>();
    selectedTab: WritableSignal<ChannelTab> = signal(ChannelTab.Joined);
    ChannelTab = ChannelTab;
    searchInput = '';
    isLoading: WritableSignal<boolean> = signal(false);

    joinedChannels: ChannelSummary[] = [];
    filteredJoinedChannels: ChannelSummary[] = [];
    directoryChannels: Channel[] = [];

    readonly dialog = inject(MatDialog);
    readonly gameRoomRegex = GAME_ROOM_REGEX;
    readonly channelGeneralId = CHANNEL_GENERAL_ID;

    private channelService = inject(ChannelService);
    private chatService: ChatService = inject(ChatService);
    async ngOnInit(): Promise<void> {
        await this.initJoinedChannels();
    }
    async searchChannel(): Promise<void> {
        if (!this.searchInput.trim()) {
            this.filteredJoinedChannels = this.joinedChannels;
            this.directoryChannels = [];
            return;
        }
        if (this.selectedTab() === ChannelTab.Joined) {
            let regex = new RegExp(this.searchInput.trim());
            this.filteredJoinedChannels = this.joinedChannels.filter((channel: ChannelSummary) => channel.name.match(regex));
        } else {
            this.isLoading.set(true);
            try {
                const channels = await firstValueFrom(this.channelService.searchChannelsByPattern(this.searchInput));
                this.directoryChannels = channels;
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
        try {
            const newChannel: ChannelSummary = await firstValueFrom(this.channelService.createChannel(channel));

            this.joinedChannels.push(newChannel);
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
        try {
            this.isLoading.set(true);
            await firstValueFrom(this.channelService.deleteChannel(channelId));
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
        try {
            this.isLoading.set(true);
            await firstValueFrom(this.channelService.leaveChannel(channelId));
        } finally {
            this.isLoading.set(false);
            this.resetSearchInput();
            await this.initJoinedChannels();
        }
    }

    openChannel(channel: ChannelSummary): void {
        this.openChat.emit(channel);
    }

    async joinChannel(channelId: string, channelName: string): Promise<void> {
        const data: ConfirmationDialogData = { ...JOIN_CHANNEL_CONFIRM_DIALOG_DATA, title: `Rejoindre « ${channelName} » ?` };
        const confirmed = await this.openConfirm(data);
        if (!confirmed) {
            return;
        }
        try {
            await firstValueFrom(this.channelService.joinChannel(channelId));
        } finally {
            this.resetSearchInput();
            await this.initJoinedChannels();
        }
    }
    private resetSearchInput(): void {
        this.searchInput = '';
        this.filteredJoinedChannels = this.joinedChannels;
        this.directoryChannels = [];
        this.selectedTab.set(ChannelTab.Joined);
    }
    private async initJoinedChannels(): Promise<void> {
        if (this.chatService) {
            const chan: ChannelSummary = {
                id: CHANNEL_GENERAL_ID,
                name: CHANNEL_GENERAL_NAME,
                createdAt: new Date(),
                isAdmin: false,
                isManageable: false,
                memberCount: 0,
            };
            this.joinedChannels = [chan];
            this.filteredJoinedChannels = [chan];
            return;
        }
        this.isLoading.set(true);
        try {
            let channels = await firstValueFrom(this.channelService.getMyChannels());
            if (this.gameChannel) channels.push(this.gameChannel);
            this.joinedChannels = channels;
            this.filteredJoinedChannels = [...channels];
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
}

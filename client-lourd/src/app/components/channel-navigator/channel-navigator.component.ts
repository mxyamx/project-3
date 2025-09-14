import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ChannelTab } from '@app/enums/channel-tab';
import { ChannelService } from '@app/services/channel/channel.service';
import { Channel, ChannelSummary } from '@common/channel';
import { firstValueFrom, take } from 'rxjs';
import { CreateChannelDialogComponent } from '../create-channel-dialog/create-channel-dialog.component';
import { LoadingComponent } from '../loading/loading.component';

@Component({
    selector: 'app-channel-navigator',
    standalone: true,
    imports: [CommonModule, FormsModule, LoadingComponent],
    templateUrl: './channel-navigator.component.html',
    styleUrl: './channel-navigator.component.scss',
})
export class ChannelNavigatorComponent implements OnInit {
    @Input() isPopup: boolean = false;
    @Output() openChat: EventEmitter<string> = new EventEmitter<string>();
    selectedTab: WritableSignal<ChannelTab> = signal(ChannelTab.Joined);
    ChannelTab = ChannelTab;
    searchInput = '';
    isLoading: WritableSignal<boolean> = signal(false);

    joinedChannels: ChannelSummary[] = [];
    filteredJoinedChannels: ChannelSummary[] = [];
    directoryChannels: Channel[] = [];

    readonly dialog = inject(MatDialog);

    private channelService = inject(ChannelService);
    async ngOnInit(): Promise<void> {
        this.isLoading.set(true);
        try {
            const channels = await firstValueFrom(this.channelService.getMyChannels());
            this.joinedChannels = channels;
            this.filteredJoinedChannels = [...channels];
        } finally {
            this.isLoading.set(false);
        }
    }
    searchChannel() {
        if (!this.searchInput.trim()) {
            this.filteredJoinedChannels = this.joinedChannels;
            return;
        }
        if (this.selectedTab() === ChannelTab.Joined) {
            let regex = new RegExp(this.searchInput.trim());
            this.filteredJoinedChannels = this.joinedChannels.filter((channel: ChannelSummary) => channel.name.match(regex));
        } else {
            console.log('search channel');
        }
    }

    async openDialog(): Promise<void> {
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
        if (!name) {
            console.log('Créer canal:', name);
        }
    }

    openChannelPopup(): void {
        console.log('open popup');
    }

    createChannel(): void {
        console.log('create channel');
    }

    deleteChannel(channelId: string): void {
        console.log(channelId);
    }

    openChannel(channelId: string): void {
        this.openChat.emit(channelId);
    }

    joinChannel(arg0: string) {
        throw new Error('Method not implemented.');
    }
}

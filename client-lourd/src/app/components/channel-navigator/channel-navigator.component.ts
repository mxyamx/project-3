import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChannelTab } from '@app/enums/channel-tab';
import { ChannelWithFlag } from '@app/interfaces/channel-with-flag';
import { Channel } from '@common/channel';
import { LoadingComponent } from '../loading/loading.component';

@Component({
    selector: 'app-channel-navigator',
    standalone: true,
    imports: [CommonModule, FormsModule, LoadingComponent],
    templateUrl: './channel-navigator.component.html',
    styleUrl: './channel-navigator.component.scss',
})
export class ChannelNavigatorComponent implements OnInit {
    joinChannel(arg0: string) {
        throw new Error('Method not implemented.');
    }

    @Input() isPopup: boolean = false;
    selectedTab: WritableSignal<ChannelTab> = signal(ChannelTab.Joined);
    ChannelTab = ChannelTab;
    searchInput = '';
    @Output() openChat: EventEmitter<string> = new EventEmitter<string>();

    isLoading: WritableSignal<boolean> = signal(false);

    joinedChannels: ChannelWithFlag[] = [
        { id: 'GENERAL', name: 'GENERAL', adminId: 'GENERAL', createdAt: new Date(), memberIds: [], isDeletable: false },
        { id: '1', name: 'test1', adminId: '1', createdAt: new Date(), memberIds: [], isDeletable: true },
        { id: '2', name: 'test2', adminId: '2', createdAt: new Date(), memberIds: [], isDeletable: true },
        { id: '3', name: 'test4', adminId: '3', createdAt: new Date(), memberIds: [], isDeletable: true },
        { id: '4', name: 'GENERAL', adminId: 'GENERAL', createdAt: new Date(), memberIds: [], isDeletable: true },
        { id: '5', name: 'test1', adminId: '1', createdAt: new Date(), memberIds: [], isDeletable: true },
        { id: '6', name: 'test2', adminId: '2', createdAt: new Date(), memberIds: [], isDeletable: true },
        { id: '7', name: 'test4', adminId: '3', createdAt: new Date(), memberIds: [], isDeletable: true },
        { id: '8', name: 'GENERAL', adminId: 'GENERAL', createdAt: new Date(), memberIds: [], isDeletable: true },
        { id: '9', name: 'test1', adminId: '1', createdAt: new Date(), memberIds: [], isDeletable: true },
        { id: '10', name: 'test2', adminId: '2', createdAt: new Date(), memberIds: [], isDeletable: true },
        { id: '11', name: 'test4', adminId: '3', createdAt: new Date(), memberIds: [], isDeletable: true },
    ];
    filteredJoinedChannels: ChannelWithFlag[] = [];
    directoryChannels: Channel[] = [];
    ngOnInit(): void {
        this.filteredJoinedChannels = this.joinedChannels;
    }
    searchChannel() {
        if (!this.searchInput.trim()) {
            this.filteredJoinedChannels = this.joinedChannels;
            return;
        }
        if (this.selectedTab() === ChannelTab.Joined) {
            let regex = new RegExp(this.searchInput.trim());
            this.filteredJoinedChannels = this.joinedChannels.filter((channel: ChannelWithFlag) => channel.name.match(regex));
        } else {
            console.log('search channel');
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
}

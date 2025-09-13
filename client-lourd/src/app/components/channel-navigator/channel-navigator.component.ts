import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChannelWithFlag } from '@app/interfaces/channel-with-flag';
import { Channel } from '@common/channel';

@Component({
    selector: 'app-channel-navigator',
    imports: [CommonModule, FormsModule],
    templateUrl: './channel-navigator.component.html',
    styleUrl: './channel-navigator.component.scss',
})
export class ChannelNavigatorComponent {
    joinChannel(arg0: string) {
        throw new Error('Method not implemented.');
    }
    channels: ChannelWithFlag[] = [
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
    isPopup: boolean = false;
    selectedTab: 'joined' | 'directory' = 'joined';
    searchInput = '';

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
    directoryChannels: Channel[] = []; // résultats du “répertoire”

    searchChannel() {
        if (this.selectedTab === 'joined') {
            // filtre local (ou requête vers listJoined ?query=...)
        } else {
            // requête vers searchDirectory ?query=...
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
        console.log(`open channel : ${channelId}`);
    }
}

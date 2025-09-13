import { Channel } from '@common/channel';

export interface ChannelWithFlag extends Channel {
    isDeletable: boolean;
}

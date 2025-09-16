import { ChannelRole } from '@common/enums/channel-role';

export interface ChannelMemberDoc {
    channelId: string;
    userId: string;
    role: ChannelRole;
    joinedAt: Date;
}

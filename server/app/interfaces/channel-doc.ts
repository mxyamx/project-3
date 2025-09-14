import { Channel } from '@common/channel';
import { ObjectId } from 'mongodb';

export interface ChannelDoc extends Channel {
    _id: ObjectId;
}

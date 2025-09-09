import { ObjectId } from 'mongodb';

export interface ChannelDoc {
    _id: ObjectId;
    id: string;
    name: string;
    adminId: string;
    createdAt: string;
    memberIds: string[];
}

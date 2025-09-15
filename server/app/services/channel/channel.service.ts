import { ChannelDoc } from '@app/interfaces/channel-doc';
import { ChannelMemberDoc } from '@app/interfaces/channel-member-doc';
import { ChatMessageDoc } from '@app/interfaces/chat-message-doc';
import { DatabaseService } from '@app/services/database/database.service';
import { Channel, ChannelSummary } from '@common/channel';
import { ROOM_GENERAL, ROOM_GENERAL_NAME } from '@common/constants/chat.constants';
import { ChannelRole } from '@common/enums/channel-role';
import { Collection, Filter, ObjectId } from 'mongodb';
import { Service } from 'typedi';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Service()
export class ChannelService {
    private generalChatCreationDate: Date;
    constructor(private databaseService: DatabaseService) {
        this.generalChatCreationDate = new Date();
    }

    get channelCollection(): Collection<ChannelDoc> {
        return this.databaseService.database.collection(process.env.CHANNEL_COLLECTION_NAME);
    }

    get memberCollection(): Collection<ChannelMemberDoc> {
        return this.databaseService.database.collection(process.env.CHANNEL_MEMBERS_COLLECTION_NAME);
    }

    get chatCollection(): Collection<ChatMessageDoc> {
        return this.databaseService.database.collection(process.env.CHAT_COLLECTION_NAME);
    }

    async getChannelsByUserId(userId: string): Promise<ChannelSummary[]> {
        const generalChannel: ChannelSummary = {
            id: ROOM_GENERAL,
            name: ROOM_GENERAL_NAME,
            createdAt: this.generalChatCreationDate,
            isAdmin: false,
            isManageable: false,
            memberCount: 0,
        };
        console.log(`the user id : ${userId}`);
        const links = await this.memberCollection.find({ userId }).toArray();
        console.log(`how many links ${links.length}`);
        if (links.length === 0) return [generalChannel];

        const channelIds = links.map((l) => {
            console.log(l.channelId);
            return l.channelId;
        });
        const channels = await this.channelCollection.find({ id: { $in: channelIds } }).toArray();

        const counts = await this.memberCollection
            .aggregate<{
                _id: string;
                count: number;
            }>([{ $match: { channelId: { $in: channelIds } } }, { $group: { _id: '$channelId', count: { $sum: 1 } } }])
            .toArray();
        const countMap = new Map(counts.map((c) => [c._id, c.count]));

        const roleMap = new Map(links.map((l) => [l.channelId, l.role]));

        const channelSummarys: ChannelSummary[] = channels.map((ch) => ({
            ...ch,
            isAdmin: roleMap.get(ch.id) === 'admin',
            memberCount: countMap.get(ch.id) ?? 0,
            isManageable: true,
        }));

        channelSummarys.push(generalChannel);
        return channelSummarys;
    }

    async createChannel(payload: Channel, userId: string): Promise<ChannelSummary> {
        const session = this.databaseService.mongo.startSession();
        const channelDoc: ChannelDoc = {
            _id: new ObjectId(),
            id: crypto.randomUUID(),
            name: payload.name.trim(),
            createdAt: payload.createdAt,
        };

        try {
            await session.withTransaction(async () => {
                await this.channelCollection.insertOne(channelDoc, { session });

                await this.memberCollection.insertOne(
                    {
                        channelId: channelDoc.id,
                        userId: userId,
                        role: ChannelRole.Admin,
                        joinedAt: payload.createdAt,
                    },
                    { session },
                );
            });
            const channel: ChannelSummary = { ...channelDoc, isAdmin: true, isManageable: true, memberCount: 1 };
            return channel;
        } finally {
            await session.endSession();
        }
    }
    async joinChannel(channelId: string, userId: string): Promise<void> {
        await this.memberCollection.updateOne(
            { channelId, userId },
            { $setOnInsert: { channelId, userId, role: ChannelRole.Member, joinedAt: new Date() } },
            { upsert: true },
        );
    }

    async leaveChannel(channelId: string, userId: string): Promise<void> {
        if (channelId === ROOM_GENERAL) throw new Error('Le canal général ne peut pas être supprimé.');
        const session = this.databaseService.mongo.startSession();
        try {
            await session.withTransaction(async () => {
                const membership = await this.memberCollection.findOne({ channelId, userId }, { session });
                if (!membership) throw new Error("L'utilisateur n'était pas membre de ce canal.");

                const isAdminLeaving = membership.role === ChannelRole.Admin;

                await this.memberCollection.deleteOne({ channelId, userId }, { session });

                if (!isAdminLeaving) return;

                const nextMember = await this.memberCollection.find({ channelId }, { session }).sort({ joinedAt: 1 }).limit(1).next();

                if (!nextMember) {
                    await this.memberCollection.deleteMany({ channelId }, { session });
                    await this.channelCollection.deleteOne({ id: channelId }, { session });
                    await this.chatCollection.deleteMany({ roomId: channelId });
                    return;
                }

                await this.memberCollection.updateOne({ channelId, userId: nextMember.userId }, { $set: { role: ChannelRole.Admin } }, { session });

                await this.channelCollection.updateOne({ id: channelId }, { $set: { updatedAt: new Date() } }, { session });
            });
        } finally {
            await session.endSession();
        }
    }

    async searchChannelsByPattern(pattern: string, userId: string): Promise<Channel[]> {
        const q = (pattern ?? '').trim();
        if (!q) return [];

        const escaped = escapeRegex(q);

        const memberships = await this.memberCollection.find({ userId }, { projection: { _id: 0, channelId: 1 } }).toArray();
        const exclude = new Set<string>(memberships.map((m) => m.channelId));

        const filter: Filter<ChannelDoc> = {
            name: { $regex: escaped, $options: 'i' },
            ...(exclude.size ? { id: { $nin: Array.from(exclude) } } : {}),
        };

        const docs = await this.channelCollection
            .find(filter, { projection: { _id: 0 } } as any)
            .sort({ name: 1 })
            .toArray();

        const rePrefix = new RegExp('^' + escaped, 'i');
        const prefix: Channel[] = [];
        const others: Channel[] = [];

        for (const d of docs) {
            const ch: Channel = { id: d.id, name: d.name, createdAt: d.createdAt };
            (rePrefix.test(d.name) ? prefix : others).push(ch);
        }
        return [...prefix, ...others];
    }

    async deleteChannel(channelId: string): Promise<void> {
        const session = this.databaseService.mongo.startSession();
        try {
            await session.withTransaction(async () => {
                await this.memberCollection.deleteMany({ channelId }, { session });
                await this.channelCollection.deleteOne({ id: channelId }, { session });
                await this.chatCollection.deleteMany({ roomId: channelId });
            });
        } finally {
            await session.endSession();
        }
    }
}

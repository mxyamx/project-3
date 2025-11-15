import { HttpException } from '@app/classes/http-exception/http.exception';
import { FRIENDS_COLLECTION } from '@app/constants/development-constants';
import { friendEvents } from '@app/events/friendEvents';
import { DatabaseService } from '@app/services/database/database.service';
import { UsersService } from '@app/services/users/users.service';
import { FriendEventType } from '@common/enums/friend-event-type';
import { RequestStatus } from '@common/enums/request-status';
import { FriendRequest, FriendRequestAcceptedPayload, FriendRequestRejectedPayload, FriendRequestSentPayload } from '@common/friend-request';
import { User } from '@common/user';
import httpStatus from 'http-status-codes';
import { Collection, ObjectId } from 'mongodb';
import { Service } from 'typedi';

@Service()
export class FriendsService {
    constructor(
        private databaseService: DatabaseService,
        private usersService: UsersService,
    ) {}

    get requestsCollection(): Collection<FriendRequest> {
        return this.databaseService.database.collection(FRIENDS_COLLECTION);
    }

    get usersCollection(): Collection<User> {
        return this.usersService.collection;
    }

    async sendFriendRequest(senderId: string, receiverId: string): Promise<FriendRequest> {
        if (senderId === receiverId) {
            throw new HttpException('Vous ne pouvez pas vous envoyer une demande à vous-même', httpStatus.BAD_REQUEST);
        }

        const [sender, receiver] = await Promise.all([this.usersService.getUser(senderId), this.usersService.getUser(receiverId)]);

        if (sender.friends?.includes(receiverId)) {
            throw new HttpException('Vous êtes déjà amis', httpStatus.BAD_REQUEST);
        }

        if (receiver.blocked?.includes(senderId)) {
            throw new HttpException("Impossible d'envoyer une demande à cet utilisateur", httpStatus.FORBIDDEN);
        }

        const existingRequest = await this.requestsCollection.findOne({
            $or: [
                { senderId, receiverId, status: RequestStatus.Pending },
                { senderId: receiverId, receiverId: senderId, status: RequestStatus.Pending },
            ],
        });

        if (existingRequest) {
            throw new HttpException('Une demande existe déjà entre ces utilisateurs', httpStatus.BAD_REQUEST);
        }

        const request: FriendRequest = {
            id: new ObjectId().toString(),
            senderId,
            receiverId,
            status: RequestStatus.Pending,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await this.requestsCollection.insertOne(request);

        const payload: FriendRequestSentPayload = {
            request: {
                id: request.id,
                senderId: sender.id,
                senderUsername: sender.username,
                senderAvatar: sender.avatar,
                receiverId: receiver.id,
            },
        };

        friendEvents.emit(FriendEventType.REQUEST_SENT, payload);

        return request;
    }

    async acceptFriendRequest(requestId: string, userId: string): Promise<{ sender: User; receiver: User }> {
        const request = await this.requestsCollection.findOne({ id: requestId });

        if (!request) {
            throw new HttpException('Demande introuvable', httpStatus.NOT_FOUND);
        }

        if (request.receiverId !== userId) {
            throw new HttpException('Non autorisé', httpStatus.FORBIDDEN);
        }

        if (request.status !== RequestStatus.Pending) {
            throw new HttpException('Cette demande a déjà été traitée', httpStatus.BAD_REQUEST);
        }

        const [sender, receiver] = await Promise.all([this.usersService.getUser(request.senderId), this.usersService.getUser(request.receiverId)]);

        await Promise.all([
            this.usersCollection.updateOne({ id: request.senderId }, { $addToSet: { friends: request.receiverId } }),
            this.usersCollection.updateOne({ id: request.receiverId }, { $addToSet: { friends: request.senderId } }),
        ]);

        await this.requestsCollection.deleteOne({ id: requestId });

        const payload: FriendRequestAcceptedPayload = {
            requestId: request.id,
            senderId: sender.id,
            receiverId: receiver.id,
            senderData: {
                id: sender.id,
                username: sender.username,
                avatar: sender.avatar,
            },
            receiverData: {
                id: receiver.id,
                username: receiver.username,
                avatar: receiver.avatar,
            },
        };

        friendEvents.emit(FriendEventType.REQUEST_ACCEPTED, payload);

        return { sender, receiver };
    }

    async rejectFriendRequest(requestId: string, userId: string): Promise<void> {
        const request = await this.requestsCollection.findOne({ id: requestId });

        if (!request || request.receiverId !== userId) {
            throw new HttpException('Demande introuvable ou non autorisée', httpStatus.NOT_FOUND);
        }

        if (request.status !== RequestStatus.Pending) {
            throw new HttpException('Cette demande a déjà été traitée', httpStatus.BAD_REQUEST);
        }

        await this.requestsCollection.deleteOne({ id: requestId });

        const payload: FriendRequestRejectedPayload = {
            requestId: request.id,
            senderId: request.senderId,
            receiverId: request.receiverId,
        };

        friendEvents.emit(FriendEventType.REQUEST_REJECTED, payload);
    }

    async removeFriend(userId: string, friendId: string): Promise<void> {
        await Promise.all([this.usersService.getUser(userId), this.usersService.getUser(friendId)]);

        await Promise.all([
            this.usersCollection.updateOne({ id: userId }, { $pull: { friends: friendId } }),
            this.usersCollection.updateOne({ id: friendId }, { $pull: { friends: userId } }),
        ]);

        friendEvents.emit(FriendEventType.FRIEND_REMOVED, {
            userId,
            friendId,
        });
    }

    async cancelFriendRequest(requestId: string, userId: string): Promise<void> {
        const request = await this.requestsCollection.findOne({ id: requestId });

        if (!request || request.senderId !== userId) {
            throw new HttpException('Demande introuvable ou non autorisée', httpStatus.NOT_FOUND);
        }

        if (request.status !== RequestStatus.Pending) {
            throw new HttpException('Cette demande ne peut plus être annulée', httpStatus.BAD_REQUEST);
        }

        await this.requestsCollection.deleteOne({ id: requestId });
    }

    async getPendingRequests(userId: string): Promise<Array<FriendRequest & { sender: { id: string; username: string; avatar: string } }>> {
        const requests = await this.requestsCollection
            .find({
                receiverId: userId,
                status: RequestStatus.Pending,
            })
            .toArray();

        const enrichedRequests = await Promise.all(
            requests.map(async (request) => {
                const sender = await this.usersService.getUser(request.senderId);
                return {
                    ...request,
                    sender: {
                        id: sender.id,
                        username: sender.username,
                        avatar: sender.avatar,
                    },
                };
            }),
        );

        return enrichedRequests;
    }

    async getSentRequests(userId: string): Promise<Array<FriendRequest & { receiver: { id: string; username: string; avatar: string } }>> {
        const requests = await this.requestsCollection
            .find({
                senderId: userId,
                status: RequestStatus.Pending,
            })
            .toArray();

        const enrichedRequests = await Promise.all(
            requests.map(async (request) => {
                const receiver = await this.usersService.getUser(request.receiverId);
                return {
                    ...request,
                    receiver: {
                        id: receiver.id,
                        username: receiver.username,
                        avatar: receiver.avatar,
                    },
                };
            }),
        );

        return enrichedRequests;
    }

    async searchUsers(query: string, currentUserId: string): Promise<User[]> {
        const currentUser = await this.usersService.getUser(currentUserId);

        const pendingRequests = await this.requestsCollection
            .find({
                $or: [
                    { senderId: currentUserId, status: RequestStatus.Pending },
                    { receiverId: currentUserId, status: RequestStatus.Pending },
                ],
            })
            .toArray();

        const pendingUserIds = pendingRequests.map((req) => (req.senderId === currentUserId ? req.receiverId : req.senderId));

        const usersWhoBlockedMe = await this.usersCollection
            .find({
                blocked: currentUserId,
            })
            .toArray();

        const blockerIds = usersWhoBlockedMe.map((user) => user.id);

        const excludedIds = [currentUserId, ...(currentUser.friends || []), ...(currentUser.blocked || []), ...pendingUserIds, ...blockerIds];

        const users = await this.usersCollection
            .find({
                id: { $nin: excludedIds },
                $and: [{ username: { $regex: query, $options: 'i' } }, { username: { $ne: '[supprimé]' } }],
            })
            .toArray();

        return users;
    }

    async getFriendsList(userId: string): Promise<User[]> {
        const user = await this.usersService.getUser(userId);

        if (!user.friends || user.friends.length === 0) {
            return [];
        }

        const friends = await this.usersCollection.find({ id: { $in: user.friends } }).toArray();

        return friends;
    }

    async blockUser(userId: string, blockedUserId: string): Promise<void> {
        if (userId === blockedUserId) {
            throw new HttpException('Vous ne pouvez pas vous bloquer vous-même', httpStatus.BAD_REQUEST);
        }

        const [user] = await Promise.all([this.usersService.getUser(userId), this.usersService.getUser(blockedUserId)]);

        if (user.blocked?.includes(blockedUserId)) {
            throw new HttpException('Cet utilisateur est déjà bloqué', httpStatus.BAD_REQUEST);
        }

        await this.usersCollection.updateOne({ id: userId }, { $addToSet: { blocked: blockedUserId } });

        if (user.friends?.includes(blockedUserId)) {
            await Promise.all([
                this.usersCollection.updateOne({ id: userId }, { $pull: { friends: blockedUserId } }),
                this.usersCollection.updateOne({ id: blockedUserId }, { $pull: { friends: userId } }),
            ]);

            friendEvents.emit(FriendEventType.FRIEND_REMOVED, {
                userId,
                friendId: blockedUserId,
            });
        }

        await this.requestsCollection.deleteMany({
            $or: [
                { senderId: userId, receiverId: blockedUserId },
                { senderId: blockedUserId, receiverId: userId },
            ],
        });
        friendEvents.emit(FriendEventType.USER_BLOCKED, {
            blockerId: userId,
            blockedUserId: blockedUserId,
        });
    }

    async unblockUser(userId: string, blockedUserId: string): Promise<void> {
        const user = await this.usersService.getUser(userId);

        if (!user.blocked?.includes(blockedUserId)) {
            throw new HttpException("Cet utilisateur n'est pas bloqué", httpStatus.BAD_REQUEST);
        }

        await this.usersCollection.updateOne({ id: userId }, { $pull: { blocked: blockedUserId } });

        friendEvents.emit(FriendEventType.USER_UNBLOCKED, {
            unblockerId: userId,
            unblockedUserId: blockedUserId,
        });
    }

    async getBlockedUsers(userId: string): Promise<User[]> {
        const user = await this.usersService.getUser(userId);

        if (!user.blocked || user.blocked.length === 0) {
            return [];
        }

        const blockedUsers = await this.usersCollection.find({ id: { $in: user.blocked } }).toArray();

        return blockedUsers;
    }
}

import { RequestStatus } from './enums/request-status';

export interface FriendRequest {
    id: string;
    senderId: string;
    receiverId: string;
    status: RequestStatus;
    createdAt: Date;
    updatedAt: Date;
}

export interface FriendRequestSentPayload {
    request: {
        id: string;
        senderId: string;
        senderUsername: string;
        senderAvatar: string;
        receiverId: string;
    };
}

export interface FriendRequestAcceptedPayload {
    requestId: string;
    senderId: string;
    receiverId: string;
    senderData: { id: string; username: string; avatar: string };
    receiverData: { id: string; username: string; avatar: string };
}

export interface FriendRemovedPayload {
    userId: string;
    friendId: string;
}

export interface FriendRequestRejectedPayload {
    requestId: string;
    senderId: string;
    receiverId: string;
}

export interface UserBlockedPayload {
    blockerId: string;
    blockedUserId: string;
}

export interface UserUnblockedPayload {
    unblockerId: string;
    unblockedUserId: string;
}

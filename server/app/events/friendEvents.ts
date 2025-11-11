import { EventEmitter } from 'events';

export enum FriendEventType {
    REQUEST_SENT = 'friend-request-sent',
    REQUEST_ACCEPTED = 'friend-request-accepted',
    REQUEST_REJECTED = 'friend-request-rejected',
    FRIEND_REMOVED = 'friend-removed',
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

class FriendEventEmitter extends EventEmitter {
    constructor() {
        super();
    }
}

export const friendEvents = new FriendEventEmitter();
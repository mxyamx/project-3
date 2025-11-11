import { RequestStatus } from "./enums/request-status";

export interface FriendRequest {
    id: string;
    senderId: string;
    receiverId: string;
    status: RequestStatus;
    createdAt: Date;
    updatedAt: Date;
}

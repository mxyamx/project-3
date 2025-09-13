export interface Channel {
    id: string;
    name: string;
    adminId: string;
    createdAt: Date;
    memberIds: string[];
}

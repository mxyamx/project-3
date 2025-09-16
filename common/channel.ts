export interface Channel {
    id: string;
    name: string;
    createdAt: Date;
}

export interface ChannelSummary extends Channel {
    isAdmin: boolean;
    memberCount: number;
    isManageable: boolean;
}

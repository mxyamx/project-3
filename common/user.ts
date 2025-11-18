import { DeviceType } from '@common/enums/deviceType';
import { GameActivityStatus } from '@common/enums/game-activity-status';
import { Parameters } from '@common/parameters';
import { PlayerStatistics } from '@common/statistics';

export interface User {
    id: string;
    username: string;
    email: string;
    avatar: string;
    friends: string[];
    blocked: string[];
    inventory: String[];
    money: number;
    parameters: Parameters;
    statistics: PlayerStatistics;
    status: DeviceType;
    purchasedAvatars?: string[];
    purchasedSounds?: string[];
    gameActivity?: GameActivityStatus;
    currentGameId?: string;
}

export interface UserStatusInfo {
    userId: string;
    username: string;
    avatar: string;
    status: DeviceType;
    gameActivity?: GameActivityStatus;
    gameId?: string;
}

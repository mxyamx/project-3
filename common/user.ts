import { DeviceType } from '@common/enums/deviceType';
import { Parameters } from '@common/parameters';
import { PlayerStatistics } from '@common/statistics';

export interface User {
    id: string;
    username: string;
    email: string;
    avatar: string;
    friends: User[];
    blocked: User[];
    inventory: String[];
    money: number;
    parameters: Parameters;
    statistics: PlayerStatistics;
    status: DeviceType;
    purchasedAvatars?: string[];
}

export interface UserDTO {
    id: string;
    username: string;
    email: string;
    avatar: string;
}

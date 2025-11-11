import { CharacterAttributes } from './character-attributes';
import { CtfTeam } from './enums/ctf-team';
import { Item } from './item';
import { Position } from './position';
import { PlayerStatistics } from './statistics';

export interface Player {
    name: string;
    character: string;
    attributes: CharacterAttributes;
    organizer: boolean;
    position?: Position;
    victories?: number;
    color?: string;
    virtualPlayer?: boolean;
    socketId: string;
    isNotInGame?: boolean;
    inventory?: Item[];
    leavingKey?: number;
    statistic?: PlayerStatistics;
    ctfTeam?: CtfTeam;
    startPosition?: Position;
}

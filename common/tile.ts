import { TileType } from '@common/enums/tile-type';
import { Action } from './action';
import { Item } from './item';
import { Player } from './player';
import { Position } from './position';

export interface Tile {
    type: TileType;
    image?: string;
    isAccessible?: boolean;
    doorState?: boolean;
    isEntryPoint?: boolean;
    containedItem?: Item;
    description?: string;
    containedPlayer?: Player;
    reachable?: boolean;
    shortestDistanceFromPosition?: Position[];
    availableAction?: Action;
    position?: Position;
}

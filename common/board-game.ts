import { BoardGameSize } from '@common/enums/board-game-size';
import { GameMode } from '@common/enums/game-mode';
import { GamePrivacy } from './enums/game-visibility';
import { ItemInfoContainer } from './item-info-container';
import { Tile } from './tile';
export interface BoardGame {
    id: string;
    name: string;
    description: string;
    size: BoardGameSize;
    gameMode: GameMode;
    privacy: GamePrivacy;
    tiles: Tile[][];
    previewImage: string;
    lastModified: Date;
    itemInfos?: ItemInfoContainer[];
    ownerId: string;
}

export interface BoardGameDTO extends Omit<BoardGame, 'ownerId'> {
    ownerId: string;
    ownerName: string;
}

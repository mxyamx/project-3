import { BoardGameSize } from '@common/enums/board-game-size';
import { GameMode } from '@common/enums/game-mode';
import { ItemInfoContainer } from './item-info-container';
import { Tile } from './tile';
export interface BoardGame {
    id: string;
    name: string;
    description: string;
    size: BoardGameSize;
    gameMode: GameMode;
    tiles: Tile[][];
    previewImage: string;
    visibility: boolean;
    lastModified: Date;
    itemInfos?: ItemInfoContainer[];
}

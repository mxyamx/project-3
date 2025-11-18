import { BoardGame } from '@common/board-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { GameMode } from '@common/enums/game-mode';
import { GamePrivacy } from '@common/enums/game-visibility';
import { ItemName } from '@common/enums/item-name';
import { ItemType } from '@common/enums/item-type';
import { TileType } from '@common/enums/tile-type';
import { VpPreferenceItem } from '@common/enums/vp-preference-item';

export const ID_LENGTH = 8;
export const DEFAULT_ATTRIBUTES_POINT = 4;
export const MAX_LENGTH_MESSAGE = 200;
export const RIGHT_CLICK = 2;
export const PERCENTAGE_CALCULATION = 100;

export const DATE_FORMAT_CONSTANTS = {
    seconds: 1000,
    minutes: 60,
};

export const MAP_SIZE = {
    small: 10,
    medium: 15,
    large: 20,
};

export const ITEM_NAMES = {
    conditionBased1: ItemName.ConditionBased1,
    conditionBased2: ItemName.ConditionBased2,
    attributeEditor1: ItemName.AttributeEditor1,
    attributeEditor2: ItemName.AttributeEditor2,
    gameEditor1: ItemName.GameEditor1,
    gameEditor2: ItemName.GameEditor2,
    randomItem: ItemName.RandomItem,
    startingPoint: ItemName.StartingPoint,
    flag: ItemName.Flag,
};

export const followerData = {
    followerHeight: 50,
    followerWidth: 50,
};

export const PREVIEW_IMAGE_SIZE = 100;

export const SORTABLE_STATISTICS_COLUMNS = {
    name: 'name',
    combatAmount: 'combatAmount',
    escapeAmount: 'escapeAmount',
    victoryAmount: 'victoryAmount',
    defeatAmount: 'defeatAmount',
    lifePointsLost: 'lifePointsLost',
    lifePointsOpponentLost: 'lifePointsOpponentLost',
    itemsCollected: 'itemsCollected',
    tilePercentage: 'tilePercentage',
};

export const SORT_DIRECTION = {
    asc: 'asc',
    desc: 'desc',
};

export const CURRENT_SORT = {
    column: 'name',
    direction: 'asc',
};

export const FROM_ITEM_TO_IMAGE: { [key: string]: string } = {
    [ItemName.AttributeEditor1]: 'assets/items/plumeDuFaucon.png',
    [ItemName.AttributeEditor2]: 'assets/items/carapaceEnchantee.png',
    [ItemName.ConditionBased1]: 'assets/items/griffeDeSurvie.png',
    [ItemName.ConditionBased2]: 'assets/items/racineDeVengeance.png',
    [ItemName.GameEditor1]: 'assets/items/fruitDeLInvisible.png',
    [ItemName.GameEditor2]: 'assets/items/retourneurDeTemps.png',
    [ItemName.RandomItem]: 'assets/items/pierreDeResurrection.png',
    [ItemName.StartingPoint]: 'assets/items/startPoint.png',
    [ItemName.Flag]: 'assets/items/flag.png',
};

export const FROM_ITEM_TO_IMAGE_ON_BOARD: { [key: string]: string } = {
    [ItemName.AttributeEditor1]: 'assets/items/plumeDuFauconTerrain.png',
    [ItemName.AttributeEditor2]: 'assets/items/carapaceEnchanteeTerrain.png',
    [ItemName.ConditionBased1]: 'assets/items/griffeDeSurvieTerrain.png',
    [ItemName.ConditionBased2]: 'assets/items/racineDeVengeanceTerrain.png',
    [ItemName.GameEditor1]: 'assets/items/fruitDeLInvisibleTerrain.png',
    [ItemName.GameEditor2]: 'assets/items/retourneurDeTempsTerrain.png',
    [ItemName.RandomItem]: 'assets/items/pierreDeResurrectionTerrain.png',
    [ItemName.StartingPoint]: 'assets/items/startPoint.png',
    [ItemName.Flag]: 'assets/items/flagTerrain.png',
};

export const FROM_BOARD_SIZE_TO_LABEL: { [key: string]: string } = {
    [BoardGameSize.Small]: '10x10',
    [BoardGameSize.Medium]: '15x15',
    [BoardGameSize.Large]: '20x20',
};

export const FROM_TILE_TYPE_TO_IMAGE: { [key in TileType]: string } = {
    [TileType.Wall]: 'assets/tiles/mur.jpg',
    [TileType.Door]: 'assets/tiles/porteFermee.jpg',
    [TileType.Water]: 'assets/tiles/eau.png',
    [TileType.Ice]: 'assets/tiles/glace.png',
    [TileType.Grass]: 'assets/tiles/gazon.png',
    [TileType.Teleportation]: 'assets/tiles/teleportation.png',
};

export const FROM_ITEM_NAME_TO_TYPE: { [key in string]: ItemType } = {
    [ITEM_NAMES.conditionBased1]: ItemType.ConditionBased,
    [ITEM_NAMES.conditionBased2]: ItemType.ConditionBased,
    [ITEM_NAMES.attributeEditor1]: ItemType.AttributeEditor,
    [ITEM_NAMES.attributeEditor2]: ItemType.AttributeEditor,
    [ITEM_NAMES.flag]: ItemType.Flag,
    [ITEM_NAMES.gameEditor1]: ItemType.GameEditor,
    [ITEM_NAMES.gameEditor2]: ItemType.GameEditor,
    [ITEM_NAMES.randomItem]: ItemType.RandomItem,
    [ITEM_NAMES.startingPoint]: ItemType.StartingPoint,
};

export const FROM_ITEM_NAME_TO_DESCRIPTION: { [key in string]: string } = {
    [ITEM_NAMES.attributeEditor1]: 'attribute-editor-1',
    [ITEM_NAMES.attributeEditor2]: 'attribute-editor-2',
    [ITEM_NAMES.conditionBased1]: 'condition-based-1',
    [ITEM_NAMES.conditionBased2]: 'condition-based-2',
    [ITEM_NAMES.gameEditor1]: 'game-editor-1',
    [ITEM_NAMES.gameEditor2]: 'game-editor-2',
    [ITEM_NAMES.randomItem]: 'random-item',
    [ITEM_NAMES.startingPoint]: 'starting-point',
    [ITEM_NAMES.flag]: 'flag',
};

export const FROM_ITEM_NAME_TO_VP_PREFERENCE: { [key in string]: VpPreferenceItem } = {
    [ITEM_NAMES.attributeEditor1]: VpPreferenceItem.Aggressive,
    [ITEM_NAMES.attributeEditor2]: VpPreferenceItem.Defensive,
    [ITEM_NAMES.conditionBased1]: VpPreferenceItem.Defensive,
    [ITEM_NAMES.conditionBased2]: VpPreferenceItem.Aggressive,
    [ITEM_NAMES.gameEditor1]: VpPreferenceItem.Defensive,
    [ITEM_NAMES.gameEditor2]: VpPreferenceItem.Aggressive,
    [ITEM_NAMES.randomItem]: VpPreferenceItem.Defensive,
};

export const FROM_TILE_TYPE_TO_DESCRIPTION: { [key in TileType]: string } = {
    [TileType.Wall]: 'wall',
    [TileType.Door]: 'door',
    [TileType.Water]: 'water',
    [TileType.Ice]: 'ice',
    [TileType.Grass]: 'grass',
    [TileType.Teleportation]: 'teleportation',
};

export const NB_ITEM_SMALL_MAP = 2;
export const NB_ITEM_MEDIUM_MAP = 4;
export const NB_ITEM_LARGE_MAP = 6;

export const DEFAULT_BOARD: BoardGame = {
    id: '',
    name: '',
    description: '',
    size: BoardGameSize.Medium,
    gameMode: GameMode.Normal,
    privacy: GamePrivacy.Private,
    tiles: [],
    previewImage: 'assets/preview.png',
    lastModified: new Date(),
    itemInfos: [],
    ownerId: '',
};

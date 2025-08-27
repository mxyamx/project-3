import { BoardGame } from '@common/board-game';
import { BoardGameSize } from '@common/enums/board-game-size';
import { GameMode } from '@common/enums/game-mode';
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
    [ITEM_NAMES.attributeEditor1]: "- Nom: Plume Du Faucon. \n - Type: Modificateur d'attributs. \n - Effet: Donne +1 Vitesse et +1 Attaque. \n",
    [ITEM_NAMES.attributeEditor2]: "- Nom: Carapace Enchantee. \n - Type: Modificateur d'attributs. \n - Effet: Donne +2 Defense et -1 Vie. \n",
    [ITEM_NAMES.conditionBased1]: '- Nom: Griffe De Survie. \n - Type: Utilisation conditionnée. \n - Effet: Si la Vie <= 2, donne +2 Defense. \n',
    [ITEM_NAMES.conditionBased2]:
        '- Nom: Racine De Vengeance. \n - Type: Utilisation conditionnée. \n - Effet: Si on a 2 victoires, donne -1 Attaque et +1 Defense. \n',
    [ITEM_NAMES.gameEditor1]: "- Nom: Fruit De L'Invisible. \n - Type: Modificateur de jeu. \n - Effet: Donne la possibilité d'avoir 3 items. \n",
    [ITEM_NAMES.gameEditor2]: '- Nom: Retourneur De Temps. \n - Type: Modificateur de jeu. \n - Effet: Donne 2 actions possibles par tour. \n',
    [ITEM_NAMES.randomItem]: '- Nom: Item Aléatoire. \n - Type: Aléatoire. \n - Effet: Non spécifique. \n',
    [ITEM_NAMES.startingPoint]: "- Nom: Point De Depart. \n C'est la position initiale de chaque joueur. \n",
    [ITEM_NAMES.flag]:
        '- Nom: Drapeau. \n Disponible uniquement en mode CTF. \n Ramenez-le à votre point de départ pour faire gagner votre équipe.\n',
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
    [TileType.Wall]: '- Nom: Mur. \n - Tuile de terrain? Non. \n Un mur bloque le passage.\n',
    [TileType.Door]:
        '- Nom: Porte. \n - Tuile de terrain? Non. \n - Coût du déplacement: 1. \n Une porte ne peut être traversee que si elle est ouverte.\n',
    [TileType.Water]: "- Nom: Eau. \n - Tuile de terrain? Oui. \n - Coût du déplacement: 2. \n Les déplacements sont plus difficiles dans l'eau.\n",
    [TileType.Ice]: "- Nom: Glace. \n - Tuile de terrain? Oui. \n - Coût du déplacement: Aucun. \n Il est facile d'avancer sur la glace.\n",
    [TileType.Grass]: '- Nom: Gazon. \n - Tuile de terrain? Oui. \n - Coût du déplacement: 1. \n Une surface normale de terrain.\n',
};

export const NB_ITEM_SMALL_MAP = 2;
export const NB_ITEM_MEDIUM_MAP = 4;
export const NB_ITEM_LARGE_MAP = 6;

export const DEFAULT_BOARD: BoardGame = {
    id: '',
    name: 'Jeu par défaut',
    description: 'Ceci est une description par défaut du jeu',
    size: BoardGameSize.Medium,
    gameMode: GameMode.Normal,
    tiles: [],
    previewImage: 'assets/preview.png',
    visibility: true,
    lastModified: new Date(),
    itemInfos: [],
};

import { VpPreferenceItem } from '@common/enums/vp-preference-item';

export const ITEM_NAMES = {
    conditionBased1: 'Griffe de Suvie',
    conditionBased2: 'Racine de vengeance',
    attributeEditor1: 'Plume du faucon',
    attributeEditor2: 'Carapace Enchantee',
    gameEditor1: "Fruit de l'invisible",
    gameEditor2: 'Retourneur de temps',
    randomItem: 'Pierre de resurrection',
    startingPoint: 'Point de depart',
    flag: 'Drapeau',
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

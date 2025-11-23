import { ItemName } from '@common/enums/item-name';
import { VpPreferenceItem } from '@common/enums/vp-preference-item';

export const FROM_ITEM_NAME_TO_VP_PREFERENCE: { [key in string]: VpPreferenceItem } = {
    [ItemName.AttributeEditor1]: VpPreferenceItem.Aggressive,
    [ItemName.AttributeEditor2]: VpPreferenceItem.Defensive,
    [ItemName.ConditionBased1]: VpPreferenceItem.Defensive,
    [ItemName.ConditionBased2]: VpPreferenceItem.Aggressive,
    [ItemName.GameEditor1]: VpPreferenceItem.Defensive,
    [ItemName.GameEditor2]: VpPreferenceItem.Aggressive,
    [ItemName.RandomItem]: VpPreferenceItem.Defensive,
};

import { ItemType } from '@common/enums/item-type';
import { VpPreferenceItem } from '@common/enums/vp-preference-item';
export interface Item {
    name: string;
    type: ItemType;
    vpPreferenceType?: VpPreferenceItem;
    description: string;
    isApplicated?: boolean;
    xPosition?: number;
    yPosition?: number;
    disabled?: boolean;
}

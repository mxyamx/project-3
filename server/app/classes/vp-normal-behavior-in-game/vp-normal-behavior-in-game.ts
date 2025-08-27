import { BaseVpBehaviorInGame } from '@app/classes/base-vp-behavior-in-game/base-vp-behavior-in-game';
import { VpState } from '@app/classes/vp-state/vp-state';
import { VpPreferenceItem } from '@common/enums/vp-preference-item';

export abstract class NormalBehaviorInGame extends BaseVpBehaviorInGame {
    constructor(protected vpState: VpState) {
        super(vpState);
    }

    protected getPreferredItemType(): VpPreferenceItem {
        return VpPreferenceItem.Defensive;
    }
}

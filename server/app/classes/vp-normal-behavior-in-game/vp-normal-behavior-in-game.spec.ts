import { NormalBehaviorInGame } from '@app/classes/vp-normal-behavior-in-game/vp-normal-behavior-in-game';
import { VpState } from '@app/classes/vp-state/vp-state';
import { VpPreferenceItem } from '@common/enums/vp-preference-item';
import { assert } from 'chai';

class TestNormalBehaviorInGame extends NormalBehaviorInGame {}
describe('NormalBehaviorInGame', () => {
    it('should return Defensive as preferred item type', () => {
        const behavior = new TestNormalBehaviorInGame({} as VpState);
        assert.equal(behavior['getPreferredItemType'](), VpPreferenceItem.Defensive);
    });
});

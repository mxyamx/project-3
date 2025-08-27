import { DEFAULT_VIRTUAL_PLAYER_NAME_LIST } from '@app/constants/development-constants';
import { DiceBonus } from '@common/enums/dice-bonus';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import { assert } from 'chai';
import { VirtualPlayerManager } from './virtual-player-manager';

describe('VirtualPlayerManager', () => {
    let virtualPlayerManager: VirtualPlayerManager;
    beforeEach(() => {
        virtualPlayerManager = new VirtualPlayerManager();
    });

    it('should create a virtual player with a valid name and attributes', () => {
        const virtualPlayer = virtualPlayerManager.createVirtualPlayer(VirtualPlayerProfile.Agressive);

        assert.isDefined(virtualPlayer);
        assert.isString(virtualPlayer.name);
        assert.isNotEmpty(virtualPlayer.name);
        assert.include(DEFAULT_VIRTUAL_PLAYER_NAME_LIST, virtualPlayer.name);
    });

    it('should assign correct bonuses based on the virtual player profile', () => {
        const aggressivePlayer = virtualPlayerManager.createVirtualPlayer(VirtualPlayerProfile.Agressive);
        const passivePlayer = virtualPlayerManager.createVirtualPlayer(VirtualPlayerProfile.Defensive);

        assert.equal(aggressivePlayer.attributes.bonusAttack, DiceBonus.SixSideBonus);
        assert.equal(aggressivePlayer.attributes.bonusDefense, DiceBonus.FourSideBonus);

        assert.equal(passivePlayer.attributes.bonusAttack, DiceBonus.FourSideBonus);
        assert.equal(passivePlayer.attributes.bonusDefense, DiceBonus.SixSideBonus);
    });

    it('should return undefined when no names are available', () => {
        DEFAULT_VIRTUAL_PLAYER_NAME_LIST.forEach(() => {
            virtualPlayerManager.createVirtualPlayer(VirtualPlayerProfile.Agressive);
        });

        const noPlayer = virtualPlayerManager.createVirtualPlayer(VirtualPlayerProfile.Agressive);
        assert.isUndefined(noPlayer);
    });

    it('should release a virtual player name', () => {
        const virtualPlayer = virtualPlayerManager.createVirtualPlayer(VirtualPlayerProfile.Agressive);
        assert.isDefined(virtualPlayer);
        virtualPlayerManager.releaseVpName(virtualPlayer.name);
        const availableNames = virtualPlayerManager['choosableVpNameList'].filter((name) => !virtualPlayerManager['usedNames'].has(name));
        assert.include(availableNames, virtualPlayer.name);
    });
});

import { DEFAULT_VIRTUAL_PLAYER_NAME_LIST } from '@app/constants/development-constants';
import { DiceBonus } from '@common/enums/dice-bonus';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import { VirtualPlayer } from '@common/virtual-player';

export class VirtualPlayerManager {
    readonly availableAvatars = [
        'bear.png',
        'bull.png',
        'deer.png',
        'eagle.png',
        'elephant.png',
        'flamingo.png',
        'giraffe.png',
        'hippo.png',
        'hyena.png',
        'kangaroo.png',
        'lion.png',
        'wolf.png',
    ];
    private readonly probabilityThreshold = 0.5;
    private readonly baseAttributeValue = 4;
    private readonly bonusAttributeValue = 6;
    private choosableVpNameList: string[];
    private usedNames: Set<string>;

    constructor() {
        this.choosableVpNameList = [...DEFAULT_VIRTUAL_PLAYER_NAME_LIST];
        this.usedNames = new Set();
    }

    createVirtualPlayer(profile: VirtualPlayerProfile): VirtualPlayer | undefined {
        const name = this.getAvailableVpName();
        if (!name) return undefined;

        this.usedNames.add(name);

        const randomBonus = Math.random() < this.probabilityThreshold ? 'health' : 'speed';
        const attributes = {
            attackValue: this.baseAttributeValue,
            defenseValue: this.baseAttributeValue,
            speedValue: randomBonus === 'speed' ? this.bonusAttributeValue : this.baseAttributeValue,
            healthValue: randomBonus === 'health' ? this.bonusAttributeValue : this.baseAttributeValue,
            bonusAttack: profile === VirtualPlayerProfile.Agressive ? DiceBonus.SixSideBonus : DiceBonus.FourSideBonus,
            bonusDefense: profile === VirtualPlayerProfile.Agressive ? DiceBonus.FourSideBonus : DiceBonus.SixSideBonus,
        };

        const virtualPlayer: VirtualPlayer = {
            userId: 'vp',
            name,
            character: `assets/avatars/${this.availableAvatars[Math.floor(Math.random() * this.availableAvatars.length)]}`,
            attributes,
            organizer: false,
            virtualPlayer: true as const,
            profile,
            color: 'red',
            socketId: '',
        };

        return virtualPlayer;
    }

    releaseVpName(name: string): void {
        this.usedNames.delete(name);
    }

    private getAvailableVpName(): string | undefined {
        const availableNames = this.choosableVpNameList.filter((name) => !this.usedNames.has(name));
        if (availableNames.length === 0) return undefined;

        const randomIndex = Math.floor(Math.random() * availableNames.length);
        return availableNames[randomIndex];
    }
}

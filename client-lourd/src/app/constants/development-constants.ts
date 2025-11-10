import { Player } from '@common/player';

import { DiceBonus } from '@common/enums/dice-bonus';
import { ItemType } from '@common/enums/item-type';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import { VirtualPlayer } from '@common/virtual-player';
export const STANDARD_GAME_CODE = '0000';
export const EMPTY_CODE = 'empty';

export const STANDARD_PLAYER: Player = {
    name: 'player-test1',
    character: 'bear',
    attributes: {
        attackValue: 2,
        defenseValue: 2,
        speedValue: 4,
        healthValue: 4,
        bonusAttack: DiceBonus.SixSideBonus,
        bonusDefense: DiceBonus.FourSideBonus,
    },
    organizer: false,
    userId: '',
};
export const STANDARD_GAME_NAME = 'Partie Test';
export const MAX_ESCAPE_ATTEMPTS = 3;
export const BONUS_ATTACK_DELAY = 800;

export const ENVIRONMENT_PATH = 'localhost:3000';

export const ATTACK_LARGE_TIME_LIMIT_SEC = 5;
export const ATTACK_SMALL_TIME_LIMIT_SEC = 3;
export const TURN_TIME_LIMIT_SEC = 30;
export const ENDGAME_COOL_DOWN_MSEC = 3000;
export const LEAVE_GAME_COOL_DOWN_MSEC = 1000;

export const INITIAL_AMOUNT_OF_ACTION = 1;
export const INITIAL_AMOUNT_OF_EVASION = 2;

export const DEFAULT_COUNTDOWN = 30;
export const FULL_PROGRESS = 100;
export const COMBAT_COUNTDOWN = 5;
export const ZERO = 0;

export const NOTIFICATION_DISPLAY_TIME = 3000;
export const COMBAT_NOTIFICATION_ID = 'combat';
export const TURN_NOTIFICATION_ID = 'turn';
export const INTERFACE_CLOSE_DELAY = 4000;
export const NOTIFICATION_ANIMATION_DURATION = 300;

export const MAXIMUM_AMOUNT_OF_ITEM = 3;

export const MAXIMUM_AMOUNT_OF_VICTORIES = 3;

export const STANDARD_ITEM = {
    name: 'test-item',
    type: ItemType.Flag,
    description: 'test-description',
};

export const STANDARD_PLAYERS: Player[] = [
    {
        name: 'player-test1',
        character: 'assets/avatars/bear.png',
        attributes: {
            attackValue: 2,
            defenseValue: 3,
            speedValue: 4,
            healthValue: 4,
            bonusAttack: DiceBonus.SixSideBonus,
            bonusDefense: DiceBonus.FourSideBonus,
        },
        organizer: false,
        color: 'blue',
        victories: 0,
        userId: '',
    },
    {
        name: 'player-test2',
        character: 'assets/avatars/flamingo.png',
        attributes: {
            attackValue: 3,
            defenseValue: 2,
            speedValue: 6,
            healthValue: 4,
            bonusAttack: DiceBonus.SixSideBonus,
            bonusDefense: DiceBonus.FourSideBonus,
        },
        organizer: false,
        color: 'green',
        victories: 0,
        userId: '',
    },
    {
        name: 'player-test3',
        character: 'assets/avatars/lion.png',
        attributes: {
            attackValue: 2,
            defenseValue: 2,
            speedValue: 2,
            healthValue: 4,
            bonusAttack: DiceBonus.FourSideBonus,
            bonusDefense: DiceBonus.SixSideBonus,
        },
        organizer: false,
        color: 'red',
        victories: 0,
        userId: '',
    },
];
export const STANDARD_LIST_PLAYERS: Player[] = [
    {
        name: '',
        character: 'bear',
        attributes: {
            attackValue: 2,
            defenseValue: 2,
            speedValue: 4,
            healthValue: 4,
            bonusAttack: DiceBonus.SixSideBonus,
            bonusDefense: DiceBonus.FourSideBonus,
        },
        organizer: false,
        color: 'blue',
        inventory: [STANDARD_ITEM],
        position: { x: 0, y: 0 },
        userId: '',
    },
    {
        name: 'player-test2',
        character: 'bear',
        attributes: {
            attackValue: 2,
            defenseValue: 2,
            speedValue: 6,
            healthValue: 4,
            bonusAttack: DiceBonus.SixSideBonus,
            bonusDefense: DiceBonus.FourSideBonus,
        },
        organizer: false,
        color: 'green',
        userId: '',
    },
    {
        name: 'player-test3',
        character: 'bear',
        attributes: {
            attackValue: 2,
            defenseValue: 2,
            speedValue: 2,
            healthValue: 4,
            bonusAttack: DiceBonus.SixSideBonus,
            bonusDefense: DiceBonus.FourSideBonus,
        },
        organizer: false,
        color: 'red',
        userId: '',
    },
    {
        name: 'player-test4',
        character: 'bear',
        attributes: {
            attackValue: 2,
            defenseValue: 2,
            speedValue: 2,
            healthValue: 4,
            bonusAttack: DiceBonus.SixSideBonus,
            bonusDefense: DiceBonus.FourSideBonus,
        },
        organizer: false,
        color: 'red',
        victories: undefined,
        userId: '',
    },
];

export const STANDARD_VIRTUAL_PLAYERS: VirtualPlayer[] = [
    {
        name: 'vp1',
        character: 'bear',
        attributes: {
            attackValue: 2,
            defenseValue: 2,
            speedValue: 4,
            healthValue: 4,
            bonusAttack: DiceBonus.SixSideBonus,
            bonusDefense: DiceBonus.FourSideBonus,
        },
        organizer: false,
        color: 'blue',
        inventory: [STANDARD_ITEM],
        position: { x: 0, y: 0 },
        profile: VirtualPlayerProfile.Agressive,
        virtualPlayer: true,
        userId: '',
    },
    {
        name: 'vp2',
        character: 'bear',
        attributes: {
            attackValue: 2,
            defenseValue: 2,
            speedValue: 6,
            healthValue: 4,
            bonusAttack: DiceBonus.SixSideBonus,
            bonusDefense: DiceBonus.FourSideBonus,
        },
        organizer: false,
        color: 'green',
        profile: VirtualPlayerProfile.Defensive,
        virtualPlayer: true,
        userId: '',
    },
    {
        name: 'vp3',
        character: 'bear',
        attributes: {
            attackValue: 2,
            defenseValue: 2,
            speedValue: 2,
            healthValue: 4,
            bonusAttack: DiceBonus.SixSideBonus,
            bonusDefense: DiceBonus.FourSideBonus,
        },
        organizer: false,
        color: 'red',
        profile: VirtualPlayerProfile.Agressive,
        virtualPlayer: true,
        userId: '',
    },
    {
        name: 'vp4',
        character: 'bear',
        attributes: {
            attackValue: 2,
            defenseValue: 2,
            speedValue: 2,
            healthValue: 4,
            bonusAttack: DiceBonus.SixSideBonus,
            bonusDefense: DiceBonus.FourSideBonus,
        },
        organizer: false,
        color: 'red',
        victories: undefined,
        profile: VirtualPlayerProfile.Defensive,
        virtualPlayer: true,
        userId: '',
    },
];

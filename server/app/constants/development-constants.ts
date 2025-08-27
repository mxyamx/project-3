import { DiceBonus } from '@common/enums/dice-bonus';
import { VirtualPlayerProfile } from '@common/enums/virtual-player-profile';
import { Player } from '@common/player';
import { VirtualPlayer } from '@common/virtual-player';

export const DATABASE_COLLECTION = 'board-games';

export const ID_GENERATION = {
    max: 10000,
    length: 4,
    defaultValue: '0',
};

export const STANDARD_BOARD_ID = '0a26603c-b769-48ff-b917-c089aa2e6e39';

export const STANDARD_ERROR_MESSAGE = 'erreur critique';

export const CLOCK_TICK_INTERVAL_MSEC = 1000;

export const MAX_FIGHT_CLOCK_SEC = 5;

export const MAX_TURN_CLOCK_SEC = 30;

export const MOVEMENT_TIME_INTERVAL_MSEC = 150;

export const TRANSITION_TIME_INTERVAL_SEC = 3;

export const MAX_AMOUNT_OF_VICTORIES = 3;

export const WAIT_TIME_FOR_CONSECUTIVE_MESSAGES_MSEC = 150;

export const MAX_AMOUNT_OF_ESCAPES = 2;

export const STANDARD_LIST_PLAYERS: Player[] = [
    {
        name: '',
        character: 'bear',
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
    },
    {
        name: 'player-test2',
        character: 'bear',
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
    },
    {
        name: 'player-test3',
        character: 'bear',
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
        position: { x: 0, y: 0 },
        profile: VirtualPlayerProfile.Agressive,
        virtualPlayer: true,
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
    },
];

export const SMALL_DICE_VALUE = 4;
export const LARGE_DICE_VALUE = 6;

export const DEFAULT_VIRTUAL_PLAYER_NAME_LIST = ['Seraphis', 'Thanos', 'Rubilax', 'Marlis', 'Loki', 'Kratos'];

import { DynamicPlayerList } from '@app/classes/dynamic-player-list/dynamic-player-list';
import { DiceBonus } from '@common/enums/dice-bonus';
import { Player } from '@common/player';
import { assert } from 'chai';

describe('DynamicPlayerList', () => {
    let list: DynamicPlayerList;
    let player1: Player;
    let player2: Player;
    let player3: Player;

    beforeEach(() => {
        list = new DynamicPlayerList();

        player1 = {
            name: 'Alice',
            character: 'Knight',
            organizer: false,
            attributes: {
                speedValue: 6,
                attackValue: 4,
                defenseValue: 4,
                healthValue: 4,
                bonusAttack: DiceBonus.SixSideBonus,
                bonusDefense: DiceBonus.FourSideBonus,
            },
            position: { x: 0, y: 0 },
        };

        player2 = {
            name: 'Bob',
            character: 'Wizard',
            organizer: false,
            attributes: {
                speedValue: 4,
                attackValue: 4,
                defenseValue: 4,
                healthValue: 6,
                bonusAttack: DiceBonus.SixSideBonus,
                bonusDefense: DiceBonus.FourSideBonus,
            },
            position: { x: 1, y: 1 },
        };

        player3 = {
            name: 'Charlie',
            character: 'Archer',
            organizer: false,
            attributes: {
                speedValue: 2,
                attackValue: 4,
                defenseValue: 4,
                healthValue: 6,
                bonusAttack: DiceBonus.FourSideBonus,
                bonusDefense: DiceBonus.SixSideBonus,
            },
            position: { x: 2, y: 2 },
        };
    });

    it('should add players and keep them sorted by speed (descending)', () => {
        list.add(player1);
        list.add(player2);
        list.add(player3);

        const values = list.getValues();
        assert.strictEqual(values[0].name, 'Alice');
        assert.strictEqual(values[1].name, 'Bob');
        assert.strictEqual(values[2].name, 'Charlie');
    });

    it('should remove a player by name', () => {
        list.add(player1);
        list.add(player2);
        list.remove(player1);

        const values = list.getValues();
        assert.lengthOf(values, 1);
        assert.strictEqual(values[0].name, 'Bob');
    });

    it('should move first player to the back of the list', () => {
        list.add(player1);
        list.add(player2);
        list.add(player3);

        const before = list.getValues().map((player) => player.name);
        list.moveFirstToBack();
        const after = list.getValues().map((player) => player.name);
        assert.deepEqual(after, [before[1], before[2], before[0]]);
    });

    it('should do nothing if list has 0 or 1 element when moving first to back', () => {
        list.add(player1);
        list.moveFirstToBack();

        const values = list.getValues();
        assert.lengthOf(values, 1);
        assert.strictEqual(values[0].name, 'Alice');
    });

    it('should return the first player correctly', () => {
        list.add(player1);
        list.add(player2);

        const first = list.getFirst();
        assert.strictEqual(first?.name, 'Alice');
    });

    it('should return undefined if list is empty', () => {
        const first = list.getFirst();
        assert.isUndefined(first);
    });
});

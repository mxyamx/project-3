/* eslint-disable @typescript-eslint/no-magic-numbers */
import { DiceBonus } from '@common/enums/dice-bonus';
import { ItemName } from '@common/enums/item-name';
import { ItemType } from '@common/enums/item-type';
import { Player } from '@common/player';
import { assert } from 'chai';
import { ItemEffectApplicator } from './item-effect-applicator';

describe('ItemEffectApplicator', () => {
    let applicator: ItemEffectApplicator;
    let player: Player;

    beforeEach(() => {
        applicator = new ItemEffectApplicator();
        player = {
            name: 'Anna',
            character: 'a',
            organizer: false,
            attributes: {
                speedValue: 4,
                attackValue: 4,
                defenseValue: 4,
                healthValue: 6,
                bonusAttack: DiceBonus.FourSideBonus,
                bonusDefense: DiceBonus.SixSideBonus,
            },
            inventory: [],
            victories: 0,
        };
    });

    describe('applyEffect', () => {
        it('should apply AttributeEditor1 effect correctly', () => {
            applicator.applyEffect(player, ItemName.AttributeEditor1);
            assert.equal(player.attributes.speedValue, 5);
            assert.equal(player.attributes.attackValue, 5);
        });

        it('should apply AttributeEditor2 effect correctly', () => {
            applicator.applyEffect(player, ItemName.AttributeEditor2);
            assert.equal(player.attributes.defenseValue, 6);
            assert.equal(player.attributes.healthValue, 5);
        });

        it('should apply ConditionBased1 effect when health is <= 2', () => {
            player.attributes.healthValue = 2;
            player.inventory = [{ name: ItemName.ConditionBased1, isApplicated: false, type: ItemType.ConditionBased, description: 'a' }];
            applicator.applyEffect(player, ItemName.ConditionBased1);
            assert.equal(player.attributes.defenseValue, 6);
            assert.isTrue(player.inventory[0].isApplicated);
        });

        it('should not apply ConditionBased1 effect when health is > 2', () => {
            player.attributes.healthValue = 3;
            player.inventory = [{ name: ItemName.ConditionBased1, isApplicated: false, type: ItemType.ConditionBased, description: 'a' }];
            applicator.applyEffect(player, ItemName.ConditionBased1);
            assert.equal(player.attributes.defenseValue, 4);
            assert.isFalse(player.inventory[0].isApplicated);
        });

        it('should apply ConditionBased2 effect when victories === 2', () => {
            player.victories = 2;
            applicator.applyEffect(player, ItemName.ConditionBased2);
            assert.equal(player.attributes.defenseValue, 5);
            assert.equal(player.attributes.attackValue, 3);
        });

        it('should not apply ConditionBased2 effect when victories !== 2', () => {
            player.victories = 1;
            applicator.applyEffect(player, ItemName.ConditionBased2);
            assert.equal(player.attributes.defenseValue, 4);
            assert.equal(player.attributes.attackValue, 4);
        });

        it('should do nothing for other item', () => {
            const initialAttributes = { ...player.attributes };
            applicator.applyEffect(player, 'other-item');
            assert.deepEqual(player.attributes, initialAttributes);
        });
    });

    describe('removeEffect', () => {
        it('should remove AttributeEditor1 effect correctly', () => {
            player.attributes.speedValue = 1;
            player.attributes.attackValue = 1;
            applicator.removeEffect(player, ItemName.AttributeEditor1);
            assert.equal(player.attributes.speedValue, 0);
            assert.equal(player.attributes.attackValue, 0);
        });

        it('should remove AttributeEditor2 effect correctly', () => {
            player.attributes.defenseValue = 2;
            player.attributes.healthValue = -1;
            applicator.removeEffect(player, ItemName.AttributeEditor2);
            assert.equal(player.attributes.defenseValue, 0);
            assert.equal(player.attributes.healthValue, 0);
        });

        it('should remove ConditionBased1 effect when health is <= 2', () => {
            player.attributes.healthValue = 2;
            player.attributes.defenseValue = 2;
            player.inventory = [{ name: ItemName.ConditionBased1, isApplicated: true, type: ItemType.ConditionBased, description: 'a' }];
            applicator.removeEffect(player, ItemName.ConditionBased1);
            assert.equal(player.attributes.defenseValue, 0);
        });

        it('should remove ConditionBased2 effect when victories === 2', () => {
            player.victories = 2;
            player.attributes.defenseValue = 1;
            player.attributes.attackValue = -1;
            applicator.removeEffect(player, ItemName.ConditionBased2);
            assert.equal(player.attributes.defenseValue, 0);
            assert.equal(player.attributes.attackValue, 0);
        });

        it('should set isApplicated to false for ConditionBased1 when removing', () => {
            player.inventory = [{ name: ItemName.ConditionBased1, isApplicated: true, type: ItemType.ConditionBased, description: 'a' }];
            applicator.removeEffect(player, ItemName.ConditionBased1);
            assert.isFalse(player.inventory[0].isApplicated);
        });

        it('should do nothing for other item', () => {
            const initialAttributes = { ...player.attributes };
            applicator.removeEffect(player, 'other-item');
            assert.deepEqual(player.attributes, initialAttributes);
        });
    });

    describe('hasItem', () => {
        it('should return true if player has the item', () => {
            player.inventory = [{ name: ItemName.AttributeEditor1, type: ItemType.AttributeEditor, description: 'a' }];
            assert.isTrue(applicator.hasItem(player, ItemName.AttributeEditor1));
        });

        it('should return false if player does not have the item', () => {
            player.inventory = [{ name: ItemName.AttributeEditor1, type: ItemType.AttributeEditor, description: 'a' }];
            assert.isFalse(applicator.hasItem(player, ItemName.AttributeEditor2));
        });

        it('should return false for empty inventory', () => {
            assert.isFalse(applicator.hasItem(player, ItemName.AttributeEditor1));
        });
    });
});

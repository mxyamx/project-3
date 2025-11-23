import { ItemName } from '@common/enums/item-name';
import { Player } from '@common/player';

export class ItemEffectApplicator {
    applyEffect(player: Player, item: string) {
        switch (item) {
            case ItemName.AttributeEditor1:
                this.applyAttributeEditor1(player);
                break;
            case ItemName.AttributeEditor2:
                this.applyAttributeEditor2(player);
                break;
            case ItemName.ConditionBased1:
                this.applyConditionBased1(player);
                break;
            case ItemName.ConditionBased2:
                this.applyConditionBased2(player);
                break;
            default:
                break;
        }
    }

    removeEffect(player: Player, item: string) {
        switch (item) {
            case ItemName.AttributeEditor1:
                this.removeAttributeEditor1(player);
                break;
            case ItemName.AttributeEditor2:
                this.removeAttributeEditor2(player);
                break;
            case ItemName.ConditionBased1:
                this.removeConditionBased1(player);
                break;
            case ItemName.ConditionBased2:
                this.removeConditionBased2(player);
                break;
            default:
                break;
        }
    }

    applyAttributeEditor1(player: Player) {
        player.attributes.speedValue++;
        player.attributes.attackValue++;
    }

    applyAttributeEditor2(player: Player) {
        player.attributes.defenseValue += 2;
        player.attributes.healthValue--;
    }

    applyConditionBased1(player: Player) {
        const item = player.inventory.find((it) => it.name === ItemName.ConditionBased1);
        if (player.attributes.healthValue <= 2 && !item.isApplicated) {
            player.attributes.defenseValue += 2;
            item.isApplicated = true;
        }
    }

    applyConditionBased2(player: Player) {
        if (player.victories === 2) {
            player.attributes.defenseValue++;
            player.attributes.attackValue--;
        }
    }

    removeAttributeEditor1(player: Player) {
        player.attributes.speedValue--;
        player.attributes.attackValue--;
    }

    removeAttributeEditor2(player: Player) {
        player.attributes.defenseValue -= 2;
        player.attributes.healthValue += 1;
    }

    removeConditionBased2(player: Player) {
        if (player.victories === 2) {
            player.attributes.defenseValue--;
            player.attributes.attackValue++;
        }
    }

    removeConditionBased1(player: Player) {
        const item = player.inventory.find((it) => it.name === ItemName.ConditionBased1);
        item.isApplicated = false;
        if (player.attributes.healthValue <= 2) {
            player.attributes.defenseValue -= 2;
        }
    }

    hasItem(player: Player, item: string) {
        return player.inventory.some((it) => it.name === item);
    }
}

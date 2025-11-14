import { Player } from '@common/player';

export class DynamicPlayerList {
    private list: Player[];
    private comparator: (a: Player, b: Player) => number;

    constructor() {
        this.comparator = (player1: Player, player2: Player) => {
            return -player1.attributes.speedValue + player2.attributes.speedValue;
        };
        this.list = [];
    }

    add(value: Player): void {
        this.list.push(value);
        this.sortList();
    }
    addToBack(value: Player): void {
        this.list.push(value);
    }

    remove(value: Player): void {
        this.list = this.list.filter((item) => item.name !== value.name);
    }

    moveFirstToBack(): void {
        if (this.list.length > 1) {
            this.list.push(this.list.shift());
        }
    }

    getValues(): Player[] {
        return [...this.list];
    }

    getFirst(): Player | undefined {
        return this.list[0];
    }

    private sortList() {
        this.list.sort(this.comparator);
    }
}

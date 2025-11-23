import { Player } from '@common/player';

export class DynamicPlayerList {
    private list: Player[] = [];
    private comparator: (a: Player, b: Player) => number;
    private readonly isRapidElim: boolean;

    constructor(isRapidElim: boolean) {
        this.isRapidElim = isRapidElim;
        this.comparator = (player1: Player, player2: Player) => {
            return -player1.attributes.speedValue + player2.attributes.speedValue;
        };
    }

    add(value: Player): void {
        this.list.push(value);
        this.sortList();
        if (this.isRapidElim) this.partitionEliminatedToBack();
    }

    addToBack(value: Player): void {
        this.list.push(value);
        if (this.isRapidElim) this.partitionEliminatedToBack();
    }

    remove(value: Player): void {
        this.list = this.list.filter((item) => item.name !== value.name);
    }

    moveFirstToBack(): void {
        if (this.list.length <= 1) return;

        if (!this.isRapidElim) {
            this.list.push(this.list.shift() as Player);
            return;
        }

        const nonEliminated = this.list.filter((p) => !p.eliminated);
        const eliminated = this.list.filter((p) => p.eliminated);

        if (nonEliminated.length <= 1) {
            return;
        }

        const first = nonEliminated.shift() as Player;
        nonEliminated.push(first);

        this.list = [...nonEliminated, ...eliminated];
    }

    getValues(): Player[] {
        return [...this.list];
    }

    getActivePlayers(): Player[] {
        return this.list.filter((p) => !p.eliminated);
    }

    getFirst(): Player | undefined {
        if (!this.isRapidElim) {
            return this.list[0];
        }

        return this.list.find((p) => !p.eliminated);
    }

    markEliminated(userId: string): void {
        const player = this.list.find((p) => p.userId === userId);
        if (player) player.eliminated = true;

        if (this.isRapidElim) this.partitionEliminatedToBack();
    }

    private sortList(): void {
        this.list.sort(this.comparator);
        if (this.isRapidElim) this.partitionEliminatedToBack();
    }

    private partitionEliminatedToBack(): void {
        if (!this.isRapidElim) return;

        const nonEliminated = this.list.filter((p) => !p.eliminated);
        const eliminated = this.list.filter((p) => p.eliminated);
        this.list = [...nonEliminated, ...eliminated];
    }
}

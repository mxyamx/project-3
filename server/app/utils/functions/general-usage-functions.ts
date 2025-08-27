import { Player } from '@common/player';

export function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const randomIndex = Math.floor(Math.random() * (i + 1));

        [array[i], array[randomIndex]] = [array[randomIndex], array[i]];
    }

    return array;
}

export function hasDuplicateNames(players: Player[]): boolean {
    const seenNames = new Set<string>();

    for (const player of players) {
        if (seenNames.has(player.name)) {
            return true;
        }
        seenNames.add(player.name);
    }

    return false;
}

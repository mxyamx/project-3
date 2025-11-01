import { ID_GENERATION } from '@app/constants/development-constants';
import { CurrentGame } from '@common/current-game';
import { Player } from '@common/player';
import 'dotenv/config';
import * as fs from 'fs';
import { Service } from 'typedi';

const clone = <T>(x: T): T => structuredClone(x);

@Service()
export class CurrentGamesService {
    private games: Map<string, CurrentGame> = new Map();
    private filePath = '/home/hugod/Desktop/Polytechnique/LOG3900/LOG3900-206/server/app/services/current-games/current-games.json';
    async getAllGames(): Promise<CurrentGame[]> {
        const values = Array.from(this.games.values());
        return values.map(clone);
    }

    async getGame(id: string): Promise<CurrentGame | null> {
        const game = this.games.get(id) || null;
        return game ? clone(game) : null;
    }

    async createGame(input: CurrentGame): Promise<CurrentGame> {
        if (!input) throw new Error('Les données du jeu actuel sont manquantes.');

        const base = clone(input);

        if (base.boardGame?.name) {
            base.name = base.boardGame.name;
        }

        base.id = await this.generateGameId();
        base.started = false;

        const toStore = clone(base);
        this.games.set(toStore.id, toStore);

        return clone(toStore);
    }

    async deleteGame(id: string): Promise<void> {
        if (!this.games.has(id)) {
            throw new Error("Le jeu actuel n'a pas été trouvé.");
        }
        this.delete(id);
    }

    async updateGame(patch: Partial<CurrentGame> & { id: string }): Promise<void> {
        const existing = this.games.get(patch.id);
        if (!existing) throw new Error('Échec lors de la mise à jour du jeu actuel.');

        const next: CurrentGame = {
            ...existing,
            name: patch.name ?? patch.boardGame?.name ?? existing.name,
            locked: patch.locked ?? existing.locked,
            started: patch.started ?? existing.started,
            adminId: patch.adminId ?? existing.adminId,
            boardGame: patch.boardGame !== undefined ? { ...existing.boardGame, ...patch.boardGame } : existing.boardGame,
            players: patch.players !== undefined ? patch.players.map((p) => ({ ...p })) : existing.players,
            id: existing.id,
        };

        this.set(next);
    }

    async addPlayer(player: Player, gameId: string): Promise<void> {
        const game = this.games.get(gameId);
        if (!game) throw new Error('Le jeu actuel est introuvable.');

        if (game.players.some((p) => p.name === player.name)) return;

        const next: CurrentGame = {
            ...game,
            players: [...game.players, clone(player)],
        };

        this.set(next);
    }

    async removePlayer(player: Player, gameId: string): Promise<void> {
        const game = this.games.get(gameId);
        if (!game) throw new Error('Le jeu actuel est introuvable.');

        const nextPlayers = game.players.filter((p) => p.name !== player.name);
        const next: CurrentGame = {
            ...game,
            players: clone(nextPlayers),
        };

        this.set(next);
    }

    private set(game: CurrentGame): void {
        const { boardGame, ...rest } = game;
        try {
            const games = this.readGames();
            const idx = games.findIndex((g) => g.id === rest.id);
            if (idx >= 0) games[idx] = rest;
            else games.push(rest);
            this.writeGames(games);
            this.games.set(game.id, game);
        } catch (error) {
            console.error('Error processing JSON file:', error);
        }
    }

    private delete(id: string) {
        try {
            const games = this.readGames().filter((g) => g.id !== id);
            this.writeGames(games);
            this.games.delete(id);
        } catch (error) {
            console.error('Error processing JSON file:', error);
        }
    }

    private readGames(): Omit<CurrentGame, 'boardGame'>[] {
        try {
            const text = fs.readFileSync(this.filePath, 'utf8').trim();
            if (!text) return [];
            return JSON.parse(text);
        } catch {
            fs.writeFileSync(this.filePath, '[]', 'utf8');
            return [];
        }
    }

    private writeGames(games: Omit<CurrentGame, 'boardGame'>[]) {
        fs.writeFileSync(this.filePath, JSON.stringify(games, null, 2), 'utf8');
    }

    private async generateGameId(): Promise<string> {
        let gameId = '';
        let isExistingGame = true;

        while (isExistingGame) {
            gameId = `${Math.floor(Math.random() * ID_GENERATION.max)}`.padStart(ID_GENERATION.length, ID_GENERATION.defaultValue);
            if (!this.games.has(gameId) && gameId !== '0000') {
                isExistingGame = false;
            }
        }
        return gameId;
    }
}

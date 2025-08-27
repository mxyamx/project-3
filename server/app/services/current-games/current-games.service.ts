import { ID_GENERATION } from '@app/constants/development-constants';
import { DatabaseService } from '@app/services/database/database.service';
import { CurrentGame } from '@common/current-game';
import { Player } from '@common/player';
import 'dotenv/config';
import { Collection, WithId } from 'mongodb';
import { Service } from 'typedi';

@Service()
export class CurrentGamesService {
    constructor(private databaseService: DatabaseService) {}
    get collection(): Collection<CurrentGame> {
        return this.databaseService.database.collection(process.env.CURRENT_GAMES_COLLECTION_NAME);
    }

    async getAllGames(): Promise<CurrentGame[]> {
        return this.collection
            .find({})
            .toArray()
            .then((games: CurrentGame[]) => {
                return games;
            });
    }

    async getGame(id: string): Promise<CurrentGame> {
        const game = await this.collection.findOne({ id });
        if (game) {
            return game;
        }
        return null;
    }

    async createGame(game: CurrentGame): Promise<CurrentGame> {
        if (!game) {
            throw new Error('Les données du jeu actuel sont manquantes.');
        }
        if (game.boardGame && game.boardGame.name) {
            game.name = game.boardGame.name;
        }
        game.id = await this.generateGameId();
        game.started = false;
        await this.collection.insertOne(game);

        return game;
    }

    async deleteGame(id: string): Promise<void> {
        return this.collection
            .findOneAndDelete({ id })
            .then((res: WithId<CurrentGame>) => {
                if (!res) {
                    throw new Error("Le jeu actuel n'a pas été trouvé.");
                }
            })
            .catch(() => {
                throw new Error('Échec lors de la suppression du jeu actuel.');
            });
    }

    async updateGame(game: CurrentGame): Promise<void> {
        const result = await this.collection.updateOne(
            { id: game.id },
            {
                $set: {
                    name: game.boardGame.name,
                    players: game.players,
                    boardGame: game.boardGame,
                    locked: game.locked,
                    started: game.started,
                },
            },
        );

        if (result.matchedCount === 0 || result.modifiedCount === 0) {
            throw new Error('Échec lors de la mise à jour du jeu actuel.');
        }
    }

    async addPlayer(player: Player, gameId: string): Promise<void> {
        const game = await this.collection.findOne({ id: gameId });
        if (!game) {
            throw new Error('Le jeu actuel est introuvable.');
        }

        game.players.push(player);
        await this.collection.updateOne({ id: gameId }, { $set: { players: game.players } });
    }

    async removePlayer(player: Player, gameId: string): Promise<void> {
        const game = await this.collection.findOne({ id: gameId });
        if (!game) {
            throw new Error('Le jeu actuel est introuvable.');
        }
        game.players = game.players.filter((removedPlayer) => removedPlayer.name !== player.name);
        await this.collection.updateOne({ id: gameId }, { $set: { players: game.players } });
    }

    private async generateGameId(): Promise<string> {
        let gameId = '';
        let isExistingGame = true;
        while (isExistingGame) {
            gameId = `${Math.floor(Math.random() * ID_GENERATION.max)}`.padStart(ID_GENERATION.length, ID_GENERATION.defaultValue);

            const existingGame = await this.collection.findOne({ id: gameId.toString() });

            if (!existingGame && gameId !== '0000') {
                isExistingGame = false;
            }
        }
        return gameId.toString();
    }
}

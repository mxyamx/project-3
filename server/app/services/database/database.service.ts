import 'dotenv/config';
import { Db, MongoClient } from 'mongodb';
import { Service } from 'typedi';

@Service()
export class DatabaseService {
    private db: Db;
    private client: MongoClient;

    get database(): Db {
        return this.db;
    }

    get mongo(): MongoClient {
        return this.client;
    }

    async start(url: string = process.env.DB_URL): Promise<void> {
        try {
            this.client = new MongoClient(url);
            await this.client.connect();

            this.db = this.client.db(process.env.DB_NAME);
        } catch (error) {
            throw new Error('Erreur de connection à la base de donnée.');
        }
    }

    async closeConnection(): Promise<void> {
        return this.client.close();
    }
}

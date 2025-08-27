import { DatabaseService } from '@app/services/database/database.service';
import { fail } from 'assert';
import { assert } from 'chai';
import { describe } from 'mocha';
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('Database Service', () => {
    let databaseService: DatabaseService;
    let mongoServer: MongoMemoryServer;

    beforeEach(async () => {
        databaseService = new DatabaseService();

        mongoServer = await MongoMemoryServer.create();

        process.env.DATABASE_NAME = 'LOG2990';
        process.env.DATABASE_COLLECTION = 'board-games';
    });

    afterEach(async () => {
        if (databaseService['client']) {
            await databaseService['client'].close();
        }
    });

    it('database service should connect', async () => {
        process.env.DB_URL = mongoServer.getUri();
        await databaseService.start();
        assert.isDefined(databaseService['client']);
        assert.equal(databaseService['db'].databaseName, 'LOG2990');
    });

    it('database service should return error if connection fails', async () => {
        try {
            await databaseService.start('WRONG URL');
            fail();
        } catch {
            assert.isUndefined(databaseService['client']);
        }
    });

    it('should return the database instance', async () => {
        const mongoUri = mongoServer.getUri();
        await databaseService.start(mongoUri);

        const db = databaseService.database;
        assert.isDefined(db);
        assert.equal(db.databaseName, 'LOG2990');
    });

    it('should close the database connection', async () => {
        const mongoUri = mongoServer.getUri();
        await databaseService.start(mongoUri);

        await databaseService.closeConnection();
        try {
            databaseService['client'].db('test');
        } catch (error) {
            assert.equal(error.message, 'Client should be closed');
        }
    });
});

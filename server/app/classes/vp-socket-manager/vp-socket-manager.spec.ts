import { assert } from 'chai';
import { createServer, Server as HttpServer } from 'http';
import * as sinon from 'sinon';
import { Server as IOServer, Socket as ServerSocket } from 'socket.io';
import { VpSocketManager } from './vp-socket-manager';

describe('VpSocketManager tests', () => {
    let httpServer: HttpServer;
    let ioServer: IOServer;
    let serverSocket: ServerSocket;
    let sandbox: sinon.SinonSandbox;
    let vpSocketManager: VpSocketManager;

    const port = 3000;
    const RESPONSE_DELAY = 100;

    beforeEach((done) => {
        sandbox = sinon.createSandbox();
        httpServer = createServer();
        ioServer = new IOServer(httpServer, {
            cors: {
                origin: '*',
            },
        });

        httpServer.listen(port, () => {
            ioServer.once('connection', (socket) => {
                serverSocket = socket;
                done();
            });

            vpSocketManager = new VpSocketManager();
        });
    });

    afterEach((done) => {
        sandbox.restore();

        if (vpSocketManager?.clientSocket?.connected) {
            vpSocketManager.clientSocket.disconnect();
        }

        ioServer.close();
        httpServer.close(done);
    });

    it('should emit event from client', (done) => {
        const testData = { message: 'Hello from client' };

        serverSocket.once('custom-event', (data) => {
            assert.deepEqual(data, testData);
            done();
        });

        setTimeout(() => {
            vpSocketManager.emit('custom-event', testData);
        }, RESPONSE_DELAY);
    });

    it('should emit join-room with correct room ID', (done) => {
        const roomId = 'test-room';

        serverSocket.once('join-room', (data) => {
            assert.equal(data, roomId);
            done();
        });

        setTimeout(() => {
            vpSocketManager.joinRoom(roomId);
        }, RESPONSE_DELAY);
    });
});

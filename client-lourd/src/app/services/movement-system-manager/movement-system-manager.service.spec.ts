import { TestBed } from '@angular/core/testing';
import { STANDARD_GAME_CODE } from '@app/constants/development-constants';
import { ActionDetectorService } from '@app/services/action-detector/action-detector.service';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import { SocketServerEventNames } from '@common/enums/socket-events-names';
import * as dataForm from '@common/socket-data-forms';
import { MovementSystemManagerService } from './movement-system-manager.service';

describe('MovementSystemManagerService', () => {
    let service: MovementSystemManagerService;
    let socketServiceSpy: jasmine.SpyObj<SocketClientService>;
    let actionDetectorSpy: jasmine.SpyObj<ActionDetectorService>;

    beforeEach(() => {
        actionDetectorSpy = jasmine.createSpyObj('ActionDetector', ['deactivateAction']);
        socketServiceSpy = jasmine.createSpyObj('SocketClientService', ['connect', 'send']);

        TestBed.configureTestingModule({
            providers: [
                { provide: SocketClientService, useValue: socketServiceSpy },
                { provide: ActionDetectorService, useValue: actionDetectorSpy },
                MovementSystemManagerService,
            ],
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any

        service = TestBed.inject(MovementSystemManagerService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should send an movement request with the correct information', () => {
        const data: dataForm.MoveReq = {
            gameCode: STANDARD_GAME_CODE,
            path: [],
        };

        service.movePlayer([], STANDARD_GAME_CODE);
        expect(socketServiceSpy.send).toHaveBeenCalledWith(SocketServerEventNames.Move, data);
    });

    it('should send an toggle door state  request with the correct information', () => {
        const data: dataForm.ToggleDoorStateReq = {
            gameCode: STANDARD_GAME_CODE,
            doorPosition: { x: 0, y: 0 },
        };

        service.toggleDoorState({ x: 0, y: 0 }, STANDARD_GAME_CODE);
        expect(socketServiceSpy.send).toHaveBeenCalledWith(SocketServerEventNames.ToggleDoorState, data);
    });
    it('should send a teleport request with the correct information', () => {
        const data: dataForm.TeleportPlayerReq = {
            gameCode: STANDARD_GAME_CODE,
            oldPosition: { x: 0, y: 0 },
            newPosition: { x: 0, y: 0 },
        };

        service.teleportPlayer({ x: 0, y: 0 }, { x: 0, y: 0 }, STANDARD_GAME_CODE);
        expect(socketServiceSpy.send).toHaveBeenCalledWith(SocketServerEventNames.Teleport, data);
    });
});

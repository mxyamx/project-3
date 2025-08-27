import { TestBed } from '@angular/core/testing';
import { SocketClientService } from '@app/services/client-socket/socket-client.service';
import * as dataForm from '@common/socket-data-forms';

import { STANDARD_GAME_CODE } from '@app/constants/development-constants';
import { ActionDetectorService } from '@app/services/action-detector/action-detector.service';
import { SocketServerEventNames } from '@common/enums/socket-events-names';
import { FightSystemManagerService } from './fight-system-manager.service';

describe('FightSystemManagerService', () => {
    let service: FightSystemManagerService;
    let socketServiceSpy: jasmine.SpyObj<SocketClientService>;
    let actionDetectorSpy: jasmine.SpyObj<ActionDetectorService>;

    beforeEach(() => {
        actionDetectorSpy = jasmine.createSpyObj('ActionDetector', ['deactivateAction']);
        socketServiceSpy = jasmine.createSpyObj('SocketClientService', ['connect', 'send']);

        TestBed.configureTestingModule({
            providers: [
                { provide: SocketClientService, useValue: socketServiceSpy },
                { provide: ActionDetectorService, useValue: actionDetectorSpy },
                FightSystemManagerService,
            ],
        });

        service = TestBed.inject(FightSystemManagerService);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).gameId = () => STANDARD_GAME_CODE;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should send an start fight request with the correct information', () => {
        const data: dataForm.StartFightReq = {
            gameCode: STANDARD_GAME_CODE,
            targetPlayerPosition: { x: 0, y: 0 },
        };

        service.startAttack({ x: 0, y: 0 }, STANDARD_GAME_CODE);
        expect(socketServiceSpy.send).toHaveBeenCalledWith(SocketServerEventNames.StartFight, data);
        expect(actionDetectorSpy.deactivateAction).toHaveBeenCalled();
    });
    it('should send an execute attack request with the correct information', () => {
        const data: dataForm.ExecuteAttackReq = {
            gameCode: STANDARD_GAME_CODE,
        };

        service.attackPlayer(STANDARD_GAME_CODE);
        expect(socketServiceSpy.send).toHaveBeenCalledWith(SocketServerEventNames.ExecuteAttack, data);
    });

    it('should send an attempt escape request with the correct information', () => {
        const data: dataForm.EscapeAttemptReq = {
            gameCode: STANDARD_GAME_CODE,
        };

        service.attemptEscape(STANDARD_GAME_CODE);
        expect(socketServiceSpy.send).toHaveBeenCalledWith(SocketServerEventNames.AttemptEscape, data);
    });
});

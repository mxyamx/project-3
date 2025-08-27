import { SocketClientEventNames } from '@common/enums/socket-events-names';
import * as dataForm from '@common/socket-data-forms';
import * as io from 'socket.io';

export function genErrorMessage(): dataForm.StandardRes {
    const ans: dataForm.StandardRes = {
        successful: false,
        message: 'execution error',
    };
    return ans;
}

export function sendError(message: string, sio: io.Server, roomCode: string): void {
    const ans: dataForm.ServerError = {
        message,
    };
    sio.to(roomCode).emit(SocketClientEventNames.ServerError, ans);
}

import type { NextFunction, Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { authAdmin } from '../firebase-admin';

export interface AuthedRequest extends Request {
    user?: { uid: string; email?: string };
}

export async function verifyFirebaseToken(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : '';
        if (!token) return res.status(401).json({ error: 'Missing Bearer token' });

        const decoded: DecodedIdToken = await authAdmin.verifyIdToken(token);
        req.user = { uid: decoded.uid, email: decoded.email ?? undefined };
        return next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}

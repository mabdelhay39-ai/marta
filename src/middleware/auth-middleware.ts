import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../lib/jwt';

export interface AuthRequest extends Request {
    user: { id: string; email: string };
}

export function authMiddleware(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res
            .status(401)
            .json({ message: 'Authorization header missing or malformed' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const payload = verifyJwt(token);
        req.user = { id: payload.id, email: payload.email };
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}

import { Request, Response, NextFunction } from 'express';
import { Config } from '../config';
import { Logger } from '../utils/logger';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
    const authToken = Config.getAuthToken();

    if (!authToken) {
        next();
        return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            error: 'Unauthorized',
            code: 'AUTH_REQUIRED',
            timestamp: new Date().toISOString()
        });
        return;
    }

    const token = authHeader.substring(7);
    if (token !== authToken) {
        res.status(403).json({
            error: 'Forbidden',
            code: 'INVALID_TOKEN',
            timestamp: new Date().toISOString()
        });
        return;
    }

    next();
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
    Logger.error('Request error', err);

    res.status(500).json({
        error: err.message || 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        timestamp: new Date().toISOString()
    });
}

import { Request, Response, NextFunction } from 'express';
import { Config } from '../config';
import { ErrorCode, ExtensionError } from '../types/errors';
import { logger } from '../utils/logger';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        res.status(401).json({
            error: 'Missing authorization header',
            code: ErrorCode.UNAUTHORIZED,
            timestamp: new Date().toISOString()
        });
        return;
    }

    const token = authHeader.replace('Bearer ', '');
    const expectedToken = Config.getAuthToken();

    if (token !== expectedToken) {
        res.status(401).json({
            error: 'Invalid authentication token',
            code: ErrorCode.UNAUTHORIZED,
            timestamp: new Date().toISOString()
        });
        return;
    }

    next();
}

export function errorMiddleware(
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    logger.error('Request failed', error, {
        method: req.method,
        path: req.path
    });

    if (error instanceof ExtensionError) {
        res.status(getStatusCode(error.code)).json({
            error: error.message,
            code: error.code,
            details: error.details,
            timestamp: new Date().toISOString()
        });
        return;
    }

    res.status(500).json({
        error: 'Internal server error',
        code: ErrorCode.INTERNAL_ERROR,
        timestamp: new Date().toISOString()
    });
}

function getStatusCode(errorCode: ErrorCode): number {
    switch (errorCode) {
        case ErrorCode.UNAUTHORIZED:
            return 401;
        case ErrorCode.SESSION_NOT_FOUND:
        case ErrorCode.QUESTION_NOT_FOUND:
            return 404;
        case ErrorCode.SESSION_ALREADY_EXISTS:
            return 409;
        case ErrorCode.INVALID_COMMAND:
        case ErrorCode.INVALID_ANSWER:
            return 400;
        default:
            return 500;
    }
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
    logger.info('Incoming request', {
        method: req.method,
        path: req.path,
        ip: req.ip
    });
    next();
}

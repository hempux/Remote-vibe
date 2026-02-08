import { Router, Request, Response } from 'express';
import { SessionManager } from '../services/sessionManager';
import { LanguageModelService } from '../services/languageModelService';
import { Validator } from '../utils/validator';
import { Logger } from '../utils/logger';

export function createRoutes(
    sessionManager: SessionManager,
    languageModelService: LanguageModelService
): Router {
    const router = Router();

    router.post('/extension/session/start', async (req: Request, res: Response) => {
        try {
            const validation = Validator.validateStartSessionRequest(req.body);
            if (!validation.valid) {
                res.status(400).json({
                    error: validation.error,
                    code: 'VALIDATION_ERROR',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            const { repositoryPath } = req.body;
            const session = sessionManager.createSession(repositoryPath);

            res.json({
                success: true,
                session
            });
        } catch (error) {
            Logger.error('Failed to start session', error as Error);
            res.status(500).json({
                error: (error as Error).message,
                code: 'SESSION_START_FAILED',
                timestamp: new Date().toISOString()
            });
        }
    });

    router.post('/extension/command', async (req: Request, res: Response) => {
        try {
            const validation = Validator.validateCommandRequest(req.body);
            if (!validation.valid) {
                res.status(400).json({
                    error: validation.error,
                    code: 'VALIDATION_ERROR',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            const { sessionId, command, context } = req.body;

            const session = sessionManager.getSession(sessionId);
            if (!session) {
                res.status(404).json({
                    error: 'Session not found',
                    code: 'SESSION_NOT_FOUND',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            languageModelService.executeCommand(sessionId, command, context)
                .catch(error => {
                    Logger.error('Command execution failed in background', error);
                });

            res.json({
                success: true,
                commandId: sessionId,
                status: 'accepted',
                message: 'Command is being processed'
            });
        } catch (error) {
            Logger.error('Failed to execute command', error as Error);
            res.status(500).json({
                error: (error as Error).message,
                code: 'COMMAND_FAILED',
                timestamp: new Date().toISOString()
            });
        }
    });

    router.post('/extension/respond', async (req: Request, res: Response) => {
        try {
            const validation = Validator.validateQuestionResponse(req.body);
            if (!validation.valid) {
                res.status(400).json({
                    error: validation.error,
                    code: 'VALIDATION_ERROR',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            const { questionId, answer } = req.body;

            let sessionId: string | null = null;
            for (const session of sessionManager.getAllSessions()) {
                const pendingQuestion = sessionManager.getPendingQuestion(session.id);
                if (pendingQuestion?.id === questionId) {
                    sessionId = session.id;
                    break;
                }
            }

            if (!sessionId) {
                res.status(404).json({
                    error: 'Question not found',
                    code: 'QUESTION_NOT_FOUND',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            languageModelService.respondToQuestion(sessionId, answer)
                .catch(error => {
                    Logger.error('Response processing failed in background', error);
                });

            res.json({
                success: true,
                message: 'Response is being processed'
            });
        } catch (error) {
            Logger.error('Failed to respond to question', error as Error);
            res.status(500).json({
                error: (error as Error).message,
                code: 'RESPONSE_FAILED',
                timestamp: new Date().toISOString()
            });
        }
    });

    router.get('/extension/session/:sessionId/status', (req: Request, res: Response) => {
        try {
            const { sessionId } = req.params;
            const session = sessionManager.getSession(sessionId);

            if (!session) {
                res.status(404).json({
                    error: 'Session not found',
                    code: 'SESSION_NOT_FOUND',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            const pendingQuestion = sessionManager.getPendingQuestion(sessionId);

            res.json({
                session,
                pendingQuestion
            });
        } catch (error) {
            Logger.error('Failed to get session status', error as Error);
            res.status(500).json({
                error: (error as Error).message,
                code: 'STATUS_FAILED',
                timestamp: new Date().toISOString()
            });
        }
    });

    router.get('/extension/session/:sessionId/messages', (req: Request, res: Response) => {
        try {
            const { sessionId } = req.params;
            const session = sessionManager.getSession(sessionId);

            if (!session) {
                res.status(404).json({
                    error: 'Session not found',
                    code: 'SESSION_NOT_FOUND',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            const messages = sessionManager.getMessages(sessionId);

            res.json({
                messages
            });
        } catch (error) {
            Logger.error('Failed to get messages', error as Error);
            res.status(500).json({
                error: (error as Error).message,
                code: 'MESSAGES_FAILED',
                timestamp: new Date().toISOString()
            });
        }
    });

    router.delete('/extension/session/:sessionId', (req: Request, res: Response) => {
        try {
            const { sessionId } = req.params;
            const deleted = sessionManager.deleteSession(sessionId);

            if (!deleted) {
                res.status(404).json({
                    error: 'Session not found',
                    code: 'SESSION_NOT_FOUND',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            res.json({
                success: true,
                message: 'Session deleted'
            });
        } catch (error) {
            Logger.error('Failed to delete session', error as Error);
            res.status(500).json({
                error: (error as Error).message,
                code: 'DELETE_FAILED',
                timestamp: new Date().toISOString()
            });
        }
    });

    router.get('/extension/health', (req: Request, res: Response) => {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            sessions: sessionManager.getAllSessions().length
        });
    });

    return router;
}

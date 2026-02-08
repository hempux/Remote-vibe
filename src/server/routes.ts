import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { SessionManager } from '../services/sessionManager';
import { LanguageModelService } from '../services/languageModelService';
import { ContextBuilder } from '../services/contextBuilder';
import { Validator } from '../utils/validator';
import { MessageRole, SessionStatus } from '../types/messages';
import { ErrorCode, ExtensionError } from '../types/errors';
import { logger } from '../utils/logger';

export function createRoutes(
    sessionManager: SessionManager,
    languageModelService: LanguageModelService,
    contextBuilder: ContextBuilder
): Router {
    const router = Router();

    router.post('/extension/session/start', async (req: Request, res: Response) => {
        try {
            if (!Validator.validateStartSessionRequest(req.body)) {
                throw new ExtensionError(
                    'Invalid request body',
                    ErrorCode.INVALID_COMMAND
                );
            }

            const session = sessionManager.createSession(req.body.repositoryPath);

            logger.info('Session started', { sessionId: session.id });

            res.status(201).json({
                success: true,
                session
            });
        } catch (error) {
            if (error instanceof ExtensionError) {
                throw error;
            }
            throw new ExtensionError(
                'Failed to start session',
                ErrorCode.INTERNAL_ERROR,
                error
            );
        }
    });

    router.post('/extension/command', async (req: Request, res: Response) => {
        try {
            if (!Validator.validateCommandRequest(req.body)) {
                throw new ExtensionError(
                    'Invalid command request',
                    ErrorCode.INVALID_COMMAND
                );
            }

            const { sessionId, command, context } = req.body;
            const commandId = uuidv4();

            sessionManager.updateSessionStatus(sessionId, SessionStatus.Processing, command);
            sessionManager.addMessage(sessionId, MessageRole.User, command, { commandId });

            logger.info('Command received', { sessionId, commandId, command });

            res.json({
                success: true,
                commandId,
                status: 'accepted',
                message: 'Command queued for processing'
            });

            setImmediate(async () => {
                try {
                    const contextText = await contextBuilder.buildContext(
                        sessionManager.getSession(sessionId).repositoryPath,
                        context
                    );

                    await languageModelService.sendRequest(sessionId, command, contextText);

                    const questions = sessionManager.getQuestions(sessionId);
                    if (questions.length === 0) {
                        sessionManager.updateSessionStatus(sessionId, SessionStatus.Idle);
                    }
                } catch (error) {
                    logger.error('Command execution failed', error as Error, { sessionId, commandId });
                    sessionManager.updateSessionStatus(sessionId, SessionStatus.Error);
                }
            });
        } catch (error) {
            if (error instanceof ExtensionError) {
                throw error;
            }
            throw new ExtensionError(
                'Failed to process command',
                ErrorCode.COMMAND_REJECTED,
                error
            );
        }
    });

    router.post('/extension/respond', async (req: Request, res: Response) => {
        try {
            if (!Validator.validateRespondRequest(req.body)) {
                throw new ExtensionError(
                    'Invalid response request',
                    ErrorCode.INVALID_ANSWER
                );
            }

            const { questionId, answer } = req.body;

            sessionManager.removeQuestion(questionId);

            logger.info('Response received', { questionId, answer });

            res.json({
                success: true,
                status: 'accepted'
            });

            const activeSession = sessionManager.getActiveSession();
            if (activeSession) {
                setImmediate(async () => {
                    try {
                        sessionManager.addMessage(activeSession.id, MessageRole.User, answer);

                        await languageModelService.sendRequest(activeSession.id, answer);

                        const questions = sessionManager.getQuestions(activeSession.id);
                        if (questions.length === 0) {
                            sessionManager.updateSessionStatus(activeSession.id, SessionStatus.Idle);
                        }
                    } catch (error) {
                        logger.error('Failed to process response', error as Error, {
                            sessionId: activeSession.id,
                            questionId
                        });
                        sessionManager.updateSessionStatus(activeSession.id, SessionStatus.Error);
                    }
                });
            }
        } catch (error) {
            if (error instanceof ExtensionError) {
                throw error;
            }
            throw new ExtensionError(
                'Failed to process response',
                ErrorCode.INVALID_ANSWER,
                error
            );
        }
    });

    router.get('/extension/session/:sessionId/status', (req: Request, res: Response) => {
        try {
            const { sessionId } = req.params;
            const session = sessionManager.getSession(sessionId);
            const pendingQuestions = sessionManager.getQuestions(sessionId);

            res.json({
                session,
                pendingQuestions
            });
        } catch (error) {
            if (error instanceof ExtensionError) {
                throw error;
            }
            throw new ExtensionError(
                'Failed to get session status',
                ErrorCode.INTERNAL_ERROR,
                error
            );
        }
    });

    router.get('/extension/session/:sessionId/messages', (req: Request, res: Response) => {
        try {
            const { sessionId } = req.params;
            const messages = sessionManager.getMessages(sessionId);

            res.json({
                messages
            });
        } catch (error) {
            if (error instanceof ExtensionError) {
                throw error;
            }
            throw new ExtensionError(
                'Failed to get messages',
                ErrorCode.INTERNAL_ERROR,
                error
            );
        }
    });

    router.delete('/extension/session/:sessionId', (req: Request, res: Response) => {
        try {
            const { sessionId } = req.params;
            sessionManager.deleteSession(sessionId);

            logger.info('Session deleted', { sessionId });

            res.json({
                success: true,
                message: 'Session stopped'
            });
        } catch (error) {
            if (error instanceof ExtensionError) {
                throw error;
            }
            throw new ExtensionError(
                'Failed to delete session',
                ErrorCode.INTERNAL_ERROR,
                error
            );
        }
    });

    router.get('/extension/health', (req: Request, res: Response) => {
        const activeSession = sessionManager.getActiveSession();

        res.json({
            status: 'healthy',
            version: '1.0.0',
            extensionActive: true,
            activeSession: activeSession?.id || null
        });
    });

    return router;
}

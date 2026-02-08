import { ICommandRequest } from '../types/commands';
import { IQuestionResponse } from '../types/questions';

export class Validator {
    public static validateCommandRequest(body: any): { valid: boolean; error?: string } {
        if (!body || typeof body !== 'object') {
            return { valid: false, error: 'Request body must be an object' };
        }

        if (!body.sessionId || typeof body.sessionId !== 'string') {
            return { valid: false, error: 'sessionId is required and must be a string' };
        }

        if (!body.command || typeof body.command !== 'string') {
            return { valid: false, error: 'command is required and must be a string' };
        }

        return { valid: true };
    }

    public static validateStartSessionRequest(body: any): { valid: boolean; error?: string } {
        if (!body || typeof body !== 'object') {
            return { valid: false, error: 'Request body must be an object' };
        }

        if (!body.repositoryPath || typeof body.repositoryPath !== 'string') {
            return { valid: false, error: 'repositoryPath is required and must be a string' };
        }

        return { valid: true };
    }

    public static validateQuestionResponse(body: any): { valid: boolean; error?: string } {
        if (!body || typeof body !== 'object') {
            return { valid: false, error: 'Request body must be an object' };
        }

        if (!body.questionId || typeof body.questionId !== 'string') {
            return { valid: false, error: 'questionId is required and must be a string' };
        }

        if (!body.answer || typeof body.answer !== 'string') {
            return { valid: false, error: 'answer is required and must be a string' };
        }

        return { valid: true };
    }
}

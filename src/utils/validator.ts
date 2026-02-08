import { StartSessionRequest } from '../types/session';
import { CommandRequest } from '../types/commands';
import { RespondRequest } from '../types/questions';

export class Validator {
    public static validateStartSessionRequest(body: any): body is StartSessionRequest {
        return (
            typeof body === 'object' &&
            body !== null &&
            typeof body.repositoryPath === 'string' &&
            body.repositoryPath.trim().length > 0
        );
    }

    public static validateCommandRequest(body: any): body is CommandRequest {
        return (
            typeof body === 'object' &&
            body !== null &&
            typeof body.sessionId === 'string' &&
            body.sessionId.trim().length > 0 &&
            typeof body.command === 'string' &&
            body.command.trim().length > 0 &&
            body.command.length <= 10000
        );
    }

    public static validateRespondRequest(body: any): body is RespondRequest {
        return (
            typeof body === 'object' &&
            body !== null &&
            typeof body.questionId === 'string' &&
            body.questionId.trim().length > 0 &&
            typeof body.answer === 'string' &&
            body.answer.trim().length > 0 &&
            body.answer.length <= 1000
        );
    }

    public static isValidUUID(str: string): boolean {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
    }

    public static isValidPath(path: string): boolean {
        return typeof path === 'string' && path.trim().length > 0;
    }
}

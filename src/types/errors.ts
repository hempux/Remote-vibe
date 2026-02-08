export interface ErrorResponse {
    error: string;
    code: string;
    details?: any;
    timestamp: string;
}

export enum ErrorCode {
    EXTENSION_NOT_CONNECTED = "1001",
    EXTENSION_TIMEOUT = "1002",
    LANGUAGE_MODEL_ERROR = "1003",

    SESSION_NOT_FOUND = "2001",
    SESSION_ALREADY_EXISTS = "2002",
    SESSION_TIMEOUT = "2003",
    INVALID_SESSION_STATE = "2004",

    INVALID_COMMAND = "3001",
    COMMAND_TIMEOUT = "3002",
    COMMAND_REJECTED = "3003",

    QUESTION_NOT_FOUND = "4001",
    INVALID_ANSWER = "4002",

    UNAUTHORIZED = "9001",
    INTERNAL_ERROR = "9999"
}

export class ExtensionError extends Error {
    constructor(
        message: string,
        public readonly code: ErrorCode,
        public readonly details?: any
    ) {
        super(message);
        this.name = 'ExtensionError';
    }
}

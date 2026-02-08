export interface ICommandRequest {
    sessionId: string;
    command: string;
    context?: ICommandContext;
}

export interface ICommandContext {
    includeFiles?: string[];
    includeWorkspace?: boolean;
}

export interface ICommandResponse {
    success: boolean;
    commandId: string;
    status: string;
    message?: string;
}

export interface IErrorResponse {
    error: string;
    code: string;
    details?: any;
    timestamp: string;
}

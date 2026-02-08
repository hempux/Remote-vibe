export interface CommandRequest {
    sessionId: string;
    command: string;
    context?: CommandContext;
}

export interface CommandContext {
    includeFiles?: string[];
    includeWorkspace?: boolean;
}

export interface CommandResponse {
    success: boolean;
    commandId: string;
    status: string;
    message?: string;
}

export interface TaskResult {
    commandId: string;
    success: boolean;
    summary: string;
    filesChanged: string[];
}

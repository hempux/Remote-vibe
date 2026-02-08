export interface Session {
    id: string;
    repositoryPath: string;
    status: SessionStatus;
    startedAt: string;
    lastActivityAt: string | null;
    currentCommand: string | null;
}

export enum SessionStatus {
    Idle = "idle",
    Processing = "processing",
    WaitingForInput = "waiting_for_input",
    Completed = "completed",
    Error = "error"
}

export interface StartSessionRequest {
    repositoryPath: string;
}

export interface StartSessionResponse {
    success: boolean;
    session: Session;
}

export interface SessionStatusResponse {
    session: Session;
    pendingQuestions: PendingQuestion[];
}

import { PendingQuestion } from './questions';

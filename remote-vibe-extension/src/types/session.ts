import { IConversationMessage } from './messages';
import { IPendingQuestion } from './questions';

export interface ISession {
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

export interface ISessionState extends ISession {
    messages: Map<string, IConversationMessage>;
    pendingQuestion: IPendingQuestion | null;
    conversationHistory: IConversationMessage[];
}

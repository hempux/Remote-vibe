import { v4 as uuidv4 } from 'uuid';
import { ISession, ISessionState, SessionStatus } from '../types/session';
import { IConversationMessage } from '../types/messages';
import { IPendingQuestion } from '../types/questions';
import { Logger } from '../utils/logger';

export class SessionManager {
    private readonly _sessions: Map<string, ISessionState> = new Map();

    public createSession(repositoryPath: string): ISession {
        const sessionId = uuidv4();
        const now = new Date().toISOString();

        const session: ISessionState = {
            id: sessionId,
            repositoryPath,
            status: SessionStatus.Idle,
            startedAt: now,
            lastActivityAt: null,
            currentCommand: null,
            messages: new Map(),
            pendingQuestion: null,
            conversationHistory: []
        };

        this._sessions.set(sessionId, session);
        Logger.info(`Session created: ${sessionId} for repository: ${repositoryPath}`);

        return this.toSessionDto(session);
    }

    public getSession(sessionId: string): ISession | null {
        const session = this._sessions.get(sessionId);
        return session ? this.toSessionDto(session) : null;
    }

    public getSessionState(sessionId: string): ISessionState | null {
        return this._sessions.get(sessionId) ?? null;
    }

    public updateSessionStatus(sessionId: string, status: SessionStatus, currentCommand?: string | null): void {
        const session = this._sessions.get(sessionId);
        if (!session) {
            Logger.warn(`Attempted to update non-existent session: ${sessionId}`);
            return;
        }

        session.status = status;
        session.lastActivityAt = new Date().toISOString();
        if (currentCommand !== undefined) {
            session.currentCommand = currentCommand;
        }

        Logger.debug(`Session ${sessionId} status updated to: ${status}`);
    }

    public addMessage(sessionId: string, message: IConversationMessage): void {
        const session = this._sessions.get(sessionId);
        if (!session) {
            Logger.warn(`Attempted to add message to non-existent session: ${sessionId}`);
            return;
        }

        session.messages.set(message.id, message);
        session.conversationHistory.push(message);
        session.lastActivityAt = new Date().toISOString();

        Logger.debug(`Message added to session ${sessionId}: ${message.role}`);
    }

    public getMessages(sessionId: string): IConversationMessage[] {
        const session = this._sessions.get(sessionId);
        return session ? session.conversationHistory : [];
    }

    public setPendingQuestion(sessionId: string, question: IPendingQuestion | null): void {
        const session = this._sessions.get(sessionId);
        if (!session) {
            Logger.warn(`Attempted to set pending question for non-existent session: ${sessionId}`);
            return;
        }

        session.pendingQuestion = question;
        if (question) {
            this.updateSessionStatus(sessionId, SessionStatus.WaitingForInput);
            Logger.info(`Pending question set for session ${sessionId}: ${question.questionType}`);
        }
    }

    public getPendingQuestion(sessionId: string): IPendingQuestion | null {
        const session = this._sessions.get(sessionId);
        return session?.pendingQuestion ?? null;
    }

    public deleteSession(sessionId: string): boolean {
        const deleted = this._sessions.delete(sessionId);
        if (deleted) {
            Logger.info(`Session deleted: ${sessionId}`);
        } else {
            Logger.warn(`Attempted to delete non-existent session: ${sessionId}`);
        }
        return deleted;
    }

    public getAllSessions(): ISession[] {
        return Array.from(this._sessions.values()).map(s => this.toSessionDto(s));
    }

    private toSessionDto(session: ISessionState): ISession {
        return {
            id: session.id,
            repositoryPath: session.repositoryPath,
            status: session.status,
            startedAt: session.startedAt,
            lastActivityAt: session.lastActivityAt,
            currentCommand: session.currentCommand
        };
    }
}

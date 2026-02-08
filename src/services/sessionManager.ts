import { v4 as uuidv4 } from 'uuid';
import { Session, SessionStatus } from '../types/session';
import { ConversationMessage, MessageRole } from '../types/messages';
import { PendingQuestion } from '../types/questions';
import { ErrorCode, ExtensionError } from '../types/errors';

export class SessionManager {
    private readonly _sessions: Map<string, Session> = new Map();
    private readonly _messages: Map<string, ConversationMessage[]> = new Map();
    private readonly _questions: Map<string, PendingQuestion[]> = new Map();
    private _activeSessionId: string | null = null;

    public createSession(repositoryPath: string): Session {
        if (this._activeSessionId) {
            const activeSession = this._sessions.get(this._activeSessionId);
            if (activeSession && activeSession.status !== SessionStatus.Completed) {
                throw new ExtensionError(
                    'A session is already active',
                    ErrorCode.SESSION_ALREADY_EXISTS
                );
            }
        }

        const session: Session = {
            id: uuidv4(),
            repositoryPath,
            status: SessionStatus.Idle,
            startedAt: new Date().toISOString(),
            lastActivityAt: null,
            currentCommand: null
        };

        this._sessions.set(session.id, session);
        this._messages.set(session.id, []);
        this._questions.set(session.id, []);
        this._activeSessionId = session.id;

        return session;
    }

    public getSession(sessionId: string): Session {
        const session = this._sessions.get(sessionId);
        if (!session) {
            throw new ExtensionError(
                'Session not found',
                ErrorCode.SESSION_NOT_FOUND
            );
        }
        return session;
    }

    public getActiveSession(): Session | null {
        if (!this._activeSessionId) {
            return null;
        }
        return this._sessions.get(this._activeSessionId) || null;
    }

    public updateSessionStatus(sessionId: string, status: SessionStatus, currentCommand?: string): void {
        const session = this.getSession(sessionId);
        session.status = status;
        session.lastActivityAt = new Date().toISOString();
        if (currentCommand !== undefined) {
            session.currentCommand = currentCommand;
        }
    }

    public addMessage(
        sessionId: string,
        role: MessageRole,
        content: string,
        metadata?: { filesChanged?: string[]; commandId?: string }
    ): ConversationMessage {
        const session = this.getSession(sessionId);

        const message: ConversationMessage = {
            id: uuidv4(),
            sessionId,
            role,
            content,
            timestamp: new Date().toISOString(),
            metadata
        };

        const messages = this._messages.get(sessionId) || [];
        messages.push(message);
        this._messages.set(sessionId, messages);

        session.lastActivityAt = new Date().toISOString();

        return message;
    }

    public getMessages(sessionId: string): ConversationMessage[] {
        this.getSession(sessionId); // Validate session exists
        return this._messages.get(sessionId) || [];
    }

    public addQuestion(sessionId: string, question: PendingQuestion): PendingQuestion {
        this.getSession(sessionId);

        const questionWithIds: PendingQuestion = {
            ...question,
            id: uuidv4(),
            sessionId
        };

        const questions = this._questions.get(sessionId) || [];
        questions.push(questionWithIds);
        this._questions.set(sessionId, questions);

        this.updateSessionStatus(sessionId, SessionStatus.WaitingForInput);

        return questionWithIds;
    }

    public getQuestions(sessionId: string): PendingQuestion[] {
        this.getSession(sessionId);
        return this._questions.get(sessionId) || [];
    }

    public removeQuestion(questionId: string): void {
        for (const [sessionId, questions] of this._questions.entries()) {
            const index = questions.findIndex(q => q.id === questionId);
            if (index !== -1) {
                questions.splice(index, 1);
                this._questions.set(sessionId, questions);

                if (questions.length === 0) {
                    const session = this._sessions.get(sessionId);
                    if (session && session.status === SessionStatus.WaitingForInput) {
                        session.status = SessionStatus.Processing;
                    }
                }
                return;
            }
        }

        throw new ExtensionError(
            'Question not found',
            ErrorCode.QUESTION_NOT_FOUND
        );
    }

    public deleteSession(sessionId: string): void {
        const session = this.getSession(sessionId);

        this._sessions.delete(sessionId);
        this._messages.delete(sessionId);
        this._questions.delete(sessionId);

        if (this._activeSessionId === sessionId) {
            this._activeSessionId = null;
        }
    }

    public hasActiveSession(): boolean {
        return this._activeSessionId !== null;
    }

    public getActiveSessionId(): string | null {
        return this._activeSessionId;
    }
}

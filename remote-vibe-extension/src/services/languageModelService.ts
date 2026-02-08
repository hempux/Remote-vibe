import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { IConversationMessage, MessageRole } from '../types/messages';
import { Logger } from '../utils/logger';
import { SessionManager } from './sessionManager';
import { QuestionDetector } from './questionDetector';
import { ContextBuilder } from './contextBuilder';
import { ICommandContext } from '../types/commands';
import { SessionStatus } from '../types/session';

export class LanguageModelService {
    constructor(
        private readonly _sessionManager: SessionManager,
        private readonly _contextBuilder: ContextBuilder
    ) { }

    public async executeCommand(
        sessionId: string,
        command: string,
        commandContext?: ICommandContext
    ): Promise<string> {
        const session = this._sessionManager.getSessionState(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        this._sessionManager.updateSessionStatus(sessionId, SessionStatus.Processing, command);

        const userMessage: IConversationMessage = {
            id: uuidv4(),
            sessionId,
            role: MessageRole.User,
            content: command,
            timestamp: new Date().toISOString()
        };

        this._sessionManager.addMessage(sessionId, userMessage);

        try {
            const models = await vscode.lm.selectChatModels({
                vendor: 'copilot',
                family: 'gpt-4o'
            });

            if (models.length === 0) {
                throw new Error('No language models available. Please ensure GitHub Copilot is installed and active.');
            }

            const model = models[0];
            Logger.info(`Using language model: ${model.name} (${model.vendor}/${model.family})`);

            const context = await this._contextBuilder.buildContext(
                session.repositoryPath,
                commandContext
            );

            const messages = this.buildPromptMessages(session.conversationHistory, command, context);

            let fullResponse = '';
            const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);

            for await (const chunk of response.text) {
                fullResponse += chunk;
            }

            const assistantMessage: IConversationMessage = {
                id: uuidv4(),
                sessionId,
                role: MessageRole.Assistant,
                content: fullResponse,
                timestamp: new Date().toISOString()
            };

            this._sessionManager.addMessage(sessionId, assistantMessage);

            const question = QuestionDetector.detectQuestion(fullResponse);
            if (question) {
                question.id = uuidv4();
                question.sessionId = sessionId;
                this._sessionManager.setPendingQuestion(sessionId, question);
                Logger.info(`Question detected in response: ${question.questionType}`);
            } else {
                this._sessionManager.updateSessionStatus(sessionId, SessionStatus.Idle, null);
            }

            return fullResponse;

        } catch (error) {
            Logger.error('Language model execution failed', error as Error);
            this._sessionManager.updateSessionStatus(sessionId, SessionStatus.Error, null);
            throw error;
        }
    }

    public async respondToQuestion(
        sessionId: string,
        answer: string
    ): Promise<string> {
        const session = this._sessionManager.getSessionState(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        const pendingQuestion = this._sessionManager.getPendingQuestion(sessionId);
        if (!pendingQuestion) {
            throw new Error('No pending question for this session');
        }

        this._sessionManager.setPendingQuestion(sessionId, null);

        const userMessage: IConversationMessage = {
            id: uuidv4(),
            sessionId,
            role: MessageRole.User,
            content: answer,
            timestamp: new Date().toISOString()
        };

        this._sessionManager.addMessage(sessionId, userMessage);

        return this.executeCommand(sessionId, answer);
    }

    private buildPromptMessages(
        session: IConversationMessage[],
        command: string,
        context: string
    ): vscode.LanguageModelChatMessage[] {
        const messages: vscode.LanguageModelChatMessage[] = [];

        messages.push(
            vscode.LanguageModelChatMessage.User(
                `You are a helpful AI coding assistant. You are helping the user with their repository.\n\n${context}`
            )
        );

        messages.push(
            vscode.LanguageModelChatMessage.User(command)
        );

        return messages;
    }
}

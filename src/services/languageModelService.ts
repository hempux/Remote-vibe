import * as vscode from 'vscode';
import { logger } from '../utils/logger';
import { ErrorCode, ExtensionError } from '../types/errors';
import { QuestionDetector } from './questionDetector';
import { SessionManager } from './sessionManager';
import { MessageRole } from '../types/messages';

export interface LanguageModelResponse {
    text: string;
    hasQuestion: boolean;
    questionText?: string;
}

export class LanguageModelService {
    private readonly _questionDetector: QuestionDetector;
    private readonly _sessionManager: SessionManager;

    constructor(sessionManager: SessionManager) {
        this._questionDetector = new QuestionDetector();
        this._sessionManager = sessionManager;
    }

    public async sendRequest(
        sessionId: string,
        prompt: string,
        contextText?: string
    ): Promise<LanguageModelResponse> {
        try {
            logger.info('Sending request to language model', { sessionId, promptLength: prompt.length });

            const models = await vscode.lm.selectChatModels({
                vendor: 'copilot',
                family: 'gpt-4o'
            });

            if (models.length === 0) {
                throw new ExtensionError(
                    'No language model available. Please ensure GitHub Copilot is enabled.',
                    ErrorCode.LANGUAGE_MODEL_ERROR
                );
            }

            const model = models[0];
            logger.debug('Using language model', {
                vendor: model.vendor,
                family: model.family,
                version: model.version
            });

            const messages = this.buildMessages(sessionId, prompt, contextText);
            const cancellationToken = new vscode.CancellationTokenSource().token;

            const response = await model.sendRequest(messages, {}, cancellationToken);

            let fullText = '';
            for await (const chunk of response.text) {
                fullText += chunk;
            }

            logger.info('Language model response received', {
                sessionId,
                responseLength: fullText.length
            });

            this._sessionManager.addMessage(sessionId, MessageRole.Assistant, fullText);

            const question = this._questionDetector.detect(fullText);

            if (question) {
                logger.info('Question detected in response', {
                    sessionId,
                    questionType: question.questionType
                });

                const savedQuestion = this._sessionManager.addQuestion(sessionId, question);

                return {
                    text: fullText,
                    hasQuestion: true,
                    questionText: savedQuestion.question
                };
            }

            return {
                text: fullText,
                hasQuestion: false
            };

        } catch (error) {
            logger.error('Language model request failed', error as Error, { sessionId });

            if (error instanceof ExtensionError) {
                throw error;
            }

            throw new ExtensionError(
                'Failed to get response from language model',
                ErrorCode.LANGUAGE_MODEL_ERROR,
                error
            );
        }
    }

    private buildMessages(
        sessionId: string,
        prompt: string,
        contextText?: string
    ): vscode.LanguageModelChatMessage[] {
        const messages: vscode.LanguageModelChatMessage[] = [];

        const systemPrompt = `You are a helpful AI assistant working in a VS Code workspace. 
Your task is to help users with coding tasks, answer questions, and make code changes when requested.
When you need additional information from the user, ask clear questions.
${contextText || ''}`;

        messages.push(vscode.LanguageModelChatMessage.User(systemPrompt));

        const conversationHistory = this._sessionManager.getMessages(sessionId);
        for (const msg of conversationHistory) {
            if (msg.role === MessageRole.User) {
                messages.push(vscode.LanguageModelChatMessage.User(msg.content));
            } else if (msg.role === MessageRole.Assistant) {
                messages.push(vscode.LanguageModelChatMessage.Assistant(msg.content));
            }
        }

        messages.push(vscode.LanguageModelChatMessage.User(prompt));

        return messages;
    }
}

import * as vscode from 'vscode';
import { HttpServer } from './server/httpServer';
import { SessionManager } from './services/sessionManager';
import { LanguageModelService } from './services/languageModelService';
import { ContextBuilder } from './services/contextBuilder';
import { Config } from './config';
import { Logger } from './utils/logger';

let httpServer: HttpServer | null = null;
let sessionManager: SessionManager | null = null;
let languageModelService: LanguageModelService | null = null;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    Logger.info('Remote Vibe extension is activating...');

    sessionManager = new SessionManager();
    const contextBuilder = new ContextBuilder();
    languageModelService = new LanguageModelService(sessionManager, contextBuilder);

    const port = Config.getPort();
    httpServer = new HttpServer(port, sessionManager, languageModelService);

    context.subscriptions.push(
        vscode.commands.registerCommand('remote-vibe.start', async () => {
            await startServer();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('remote-vibe.stop', async () => {
            await stopServer();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('remote-vibe.status', () => {
            showStatus();
        })
    );

    // Always auto-start the HTTP server
    Logger.info('Starting HTTP server automatically...');
    await startServer();

    Logger.info('Remote Vibe extension activated');
}

export async function deactivate(): Promise<void> {
    Logger.info('Remote Vibe extension is deactivating...');
    await stopServer();
    Logger.dispose();
}

async function startServer(): Promise<void> {
    if (!httpServer) {
        vscode.window.showErrorMessage('Remote Vibe: Server not initialized');
        return;
    }

    if (httpServer.isRunning()) {
        vscode.window.showInformationMessage('Remote Vibe: Server is already running');
        return;
    }

    try {
        await httpServer.start();
        const port = Config.getPort();
        vscode.window.showInformationMessage(
            `Remote Vibe: Server started on port ${port}`
        );
        Logger.show();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(
            `Remote Vibe: Failed to start server - ${errorMessage}`
        );
        Logger.error('Failed to start server', error as Error);
    }
}

async function stopServer(): Promise<void> {
    if (!httpServer) {
        return;
    }

    if (!httpServer.isRunning()) {
        vscode.window.showInformationMessage('Remote Vibe: Server is not running');
        return;
    }

    try {
        await httpServer.stop();
        vscode.window.showInformationMessage('Remote Vibe: Server stopped');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(
            `Remote Vibe: Failed to stop server - ${errorMessage}`
        );
        Logger.error('Failed to stop server', error as Error);
    }
}

function showStatus(): void {
    if (!httpServer) {
        vscode.window.showInformationMessage('Remote Vibe: Server not initialized');
        return;
    }

    const running = httpServer.isRunning();
    const port = Config.getPort();
    const sessionCount = sessionManager?.getAllSessions().length || 0;

    const status = running
        ? `Running on port ${port} - ${sessionCount} active session(s)`
        : 'Stopped';

    vscode.window.showInformationMessage(`Remote Vibe: ${status}`);
    Logger.show();
}

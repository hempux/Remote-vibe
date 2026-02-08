import * as vscode from 'vscode';
import { HttpServer } from './server/httpServer';
import { Config } from './config';
import { logger, LogLevel } from './utils/logger';

let httpServer: HttpServer | null = null;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext): void {
    logger.info('Remote Vibe Extension activating');

    const logLevel = Config.getLogLevel() as LogLevel;
    logger.setLogLevel(logLevel);

    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.command = 'remoteVibe.showStatus';
    context.subscriptions.push(statusBarItem);

    const startServerCommand = vscode.commands.registerCommand(
        'remoteVibe.startServer',
        async () => {
            await startServer();
        }
    );

    const stopServerCommand = vscode.commands.registerCommand(
        'remoteVibe.stopServer',
        async () => {
            await stopServer();
        }
    );

    const showStatusCommand = vscode.commands.registerCommand(
        'remoteVibe.showStatus',
        () => {
            showStatus();
        }
    );

    context.subscriptions.push(
        startServerCommand,
        stopServerCommand,
        showStatusCommand
    );

    if (Config.getAutoStart()) {
        startServer().catch(error => {
            logger.error('Auto-start failed', error);
        });
    } else {
        updateStatusBar(false);
    }

    logger.info('Remote Vibe Extension activated');
}

export function deactivate(): void {
    logger.info('Remote Vibe Extension deactivating');

    if (httpServer) {
        httpServer.stop().catch(error => {
            logger.error('Error stopping server during deactivation', error);
        });
    }

    logger.info('Remote Vibe Extension deactivated');
}

async function startServer(): Promise<void> {
    try {
        if (httpServer && httpServer.isRunning()) {
            vscode.window.showInformationMessage('Remote Vibe server is already running');
            return;
        }

        const port = Config.getPort();
        httpServer = new HttpServer(port);

        await httpServer.start();

        updateStatusBar(true);
        vscode.window.showInformationMessage(
            `Remote Vibe server started on port ${port}`
        );

        logger.info('Server started successfully', { port });
    } catch (error) {
        logger.error('Failed to start server', error as Error);
        updateStatusBar(false);
        vscode.window.showErrorMessage(
            `Failed to start Remote Vibe server: ${(error as Error).message}`
        );
    }
}

async function stopServer(): Promise<void> {
    try {
        if (!httpServer || !httpServer.isRunning()) {
            vscode.window.showInformationMessage('Remote Vibe server is not running');
            return;
        }

        await httpServer.stop();
        httpServer = null;

        updateStatusBar(false);
        vscode.window.showInformationMessage('Remote Vibe server stopped');

        logger.info('Server stopped successfully');
    } catch (error) {
        logger.error('Failed to stop server', error as Error);
        vscode.window.showErrorMessage(
            `Failed to stop Remote Vibe server: ${(error as Error).message}`
        );
    }
}

function showStatus(): void {
    const isRunning = httpServer && httpServer.isRunning();
    const port = httpServer?.getPort() || Config.getPort();

    const message = isRunning
        ? `Remote Vibe server is running on port ${port}`
        : 'Remote Vibe server is not running';

    vscode.window.showInformationMessage(message,
        isRunning ? 'Stop Server' : 'Start Server'
    ).then(selection => {
        if (selection === 'Start Server') {
            startServer();
        } else if (selection === 'Stop Server') {
            stopServer();
        }
    });
}

function updateStatusBar(isRunning: boolean): void {
    if (isRunning) {
        const port = httpServer?.getPort() || Config.getPort();
        statusBarItem.text = `$(radio-tower) Remote Vibe: ${port}`;
        statusBarItem.backgroundColor = undefined;
        statusBarItem.tooltip = `Remote Vibe server running on port ${port}. Click for options.`;
    } else {
        statusBarItem.text = '$(radio-tower) Remote Vibe: Stopped';
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        statusBarItem.tooltip = 'Remote Vibe server is stopped. Click to start.';
    }
    statusBarItem.show();
}

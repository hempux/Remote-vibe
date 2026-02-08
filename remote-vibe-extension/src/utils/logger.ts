import * as vscode from 'vscode';

export class Logger {
    private static readonly OUTPUT_CHANNEL_NAME = 'Remote Vibe';
    private static _outputChannel: vscode.OutputChannel | null = null;

    private static getChannel(): vscode.OutputChannel {
        if (!this._outputChannel) {
            this._outputChannel = vscode.window.createOutputChannel(this.OUTPUT_CHANNEL_NAME);
        }
        return this._outputChannel;
    }

    public static info(message: string): void {
        const timestamp = new Date().toISOString();
        this.getChannel().appendLine(`[${timestamp}] [INFO] ${message}`);
    }

    public static error(message: string, error?: Error): void {
        const timestamp = new Date().toISOString();
        this.getChannel().appendLine(`[${timestamp}] [ERROR] ${message}`);
        if (error) {
            this.getChannel().appendLine(`[${timestamp}] [ERROR] ${error.stack || error.message}`);
        }
    }

    public static warn(message: string): void {
        const timestamp = new Date().toISOString();
        this.getChannel().appendLine(`[${timestamp}] [WARN] ${message}`);
    }

    public static debug(message: string): void {
        const timestamp = new Date().toISOString();
        this.getChannel().appendLine(`[${timestamp}] [DEBUG] ${message}`);
    }

    public static show(): void {
        this.getChannel().show();
    }

    public static dispose(): void {
        this._outputChannel?.dispose();
        this._outputChannel = null;
    }
}

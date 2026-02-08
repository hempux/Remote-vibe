import * as vscode from 'vscode';

export class Config {
    private static readonly SECTION = 'remoteVibe';

    public static getPort(): number {
        return vscode.workspace.getConfiguration(this.SECTION).get<number>('extensionPort', 5000);
    }

    public static getBackendUrl(): string {
        return vscode.workspace.getConfiguration(this.SECTION).get<string>('backendUrl', 'http://localhost:5001');
    }

    public static getAutoStart(): boolean {
        return vscode.workspace.getConfiguration(this.SECTION).get<boolean>('autoStart', false);
    }

    public static getLogLevel(): string {
        return vscode.workspace.getConfiguration(this.SECTION).get<string>('logLevel', 'info');
    }

    public static getAuthToken(): string {
        return vscode.workspace.getConfiguration(this.SECTION).get<string>('authToken', 'test-token');
    }
}

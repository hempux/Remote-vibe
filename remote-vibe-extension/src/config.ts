import * as vscode from 'vscode';

export class Config {
    private static readonly CONFIG_SECTION = 'remoteVibe';

    public static getPort(): number {
        // Read from VS Code config, default to 5000
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        return config.get<number>('port') ?? 5000;
    }

    public static getAuthToken(): string {
        // Read from VS Code config (set via settings.json in Docker)
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        return config.get<string>('authToken') ?? '';
    }

    public static getAutoStart(): boolean {
        // Always auto-start in code-server environment
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        return config.get<boolean>('autoStart') ?? true;
    }
}

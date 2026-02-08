export enum LogLevel {
    Debug = "debug",
    Info = "info",
    Warn = "warn",
    Error = "error"
}

export class Logger {
    private static instance: Logger;
    private _logLevel: LogLevel = LogLevel.Info;

    private constructor() { }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    public setLogLevel(level: LogLevel): void {
        this._logLevel = level;
    }

    public debug(message: string, context?: Record<string, any>): void {
        if (this.shouldLog(LogLevel.Debug)) {
            this.log('debug', message, context);
        }
    }

    public info(message: string, context?: Record<string, any>): void {
        if (this.shouldLog(LogLevel.Info)) {
            this.log('info', message, context);
        }
    }

    public warn(message: string, context?: Record<string, any>): void {
        if (this.shouldLog(LogLevel.Warn)) {
            this.log('warn', message, context);
        }
    }

    public error(message: string, error?: Error, context?: Record<string, any>): void {
        if (this.shouldLog(LogLevel.Error)) {
            const errorContext = error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : undefined;
            this.log('error', message, { ...context, error: errorContext });
        }
    }

    private shouldLog(level: LogLevel): boolean {
        const levels = [LogLevel.Debug, LogLevel.Info, LogLevel.Warn, LogLevel.Error];
        return levels.indexOf(level) >= levels.indexOf(this._logLevel);
    }

    private log(level: string, message: string, context?: Record<string, any>): void {
        const logEntry = {
            level,
            message,
            timestamp: new Date().toISOString(),
            ...context
        };
        console.log(JSON.stringify(logEntry));
    }
}

export const logger = Logger.getInstance();

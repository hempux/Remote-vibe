import express, { Express } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { Server } from 'http';
import { SessionManager } from '../services/sessionManager';
import { LanguageModelService } from '../services/languageModelService';
import { createRoutes } from './routes';
import { authMiddleware, errorHandler } from './middleware';
import { Logger } from '../utils/logger';

export class HttpServer {
    private readonly _app: Express;
    private _server: Server | null = null;

    constructor(
        private readonly _port: number,
        sessionManager: SessionManager,
        languageModelService: LanguageModelService
    ) {
        this._app = express();
        this.setupMiddleware();
        this.setupRoutes(sessionManager, languageModelService);
    }

    private setupMiddleware(): void {
        this._app.use(cors());
        this._app.use(bodyParser.json());
        this._app.use(authMiddleware);
    }

    private setupRoutes(
        sessionManager: SessionManager,
        languageModelService: LanguageModelService
    ): void {
        const routes = createRoutes(sessionManager, languageModelService);
        this._app.use(routes);
        this._app.use(errorHandler);
    }

    public async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this._server = this._app.listen(this._port, () => {
                    Logger.info(`HTTP server started on port ${this._port}`);
                    resolve();
                });

                this._server.on('error', (error) => {
                    Logger.error('HTTP server error', error);
                    reject(error);
                });
            } catch (error) {
                Logger.error('Failed to start HTTP server', error as Error);
                reject(error);
            }
        });
    }

    public async stop(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this._server) {
                resolve();
                return;
            }

            this._server.close((error) => {
                if (error) {
                    Logger.error('Failed to stop HTTP server', error);
                    reject(error);
                } else {
                    Logger.info('HTTP server stopped');
                    this._server = null;
                    resolve();
                }
            });
        });
    }

    public isRunning(): boolean {
        return this._server !== null;
    }
}

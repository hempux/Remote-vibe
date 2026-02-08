import express, { Express } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { Server } from 'http';
import { createRoutes } from './routes';
import { authMiddleware, errorMiddleware, requestLogger } from './middleware';
import { SessionManager } from '../services/sessionManager';
import { LanguageModelService } from '../services/languageModelService';
import { ContextBuilder } from '../services/contextBuilder';
import { logger } from '../utils/logger';

export class HttpServer {
    private readonly _app: Express;
    private _server: Server | null = null;
    private readonly _port: number;
    private readonly _sessionManager: SessionManager;
    private readonly _languageModelService: LanguageModelService;
    private readonly _contextBuilder: ContextBuilder;

    constructor(port: number) {
        this._port = port;
        this._app = express();
        this._sessionManager = new SessionManager();
        this._languageModelService = new LanguageModelService(this._sessionManager);
        this._contextBuilder = new ContextBuilder();

        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    private setupMiddleware(): void {
        this._app.use(cors());
        this._app.use(bodyParser.json());
        this._app.use(requestLogger);
        this._app.use(authMiddleware);
    }

    private setupRoutes(): void {
        const routes = createRoutes(
            this._sessionManager,
            this._languageModelService,
            this._contextBuilder
        );
        this._app.use('/', routes);
    }

    private setupErrorHandling(): void {
        this._app.use(errorMiddleware);
    }

    public async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this._server = this._app.listen(this._port, () => {
                    logger.info('HTTP server started', { port: this._port });
                    resolve();
                });

                this._server.on('error', (error: Error) => {
                    logger.error('Server error', error);
                    reject(error);
                });
            } catch (error) {
                logger.error('Failed to start server', error as Error);
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
                    logger.error('Error stopping server', error);
                    reject(error);
                } else {
                    logger.info('HTTP server stopped');
                    this._server = null;
                    resolve();
                }
            });
        });
    }

    public isRunning(): boolean {
        return this._server !== null;
    }

    public getPort(): number {
        return this._port;
    }
}

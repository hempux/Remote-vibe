# TypeScript Standards for VS Code Extension

## Overview
TypeScript coding standards for the Remote Vibe VS Code Extension. These standards ensure professional, maintainable code.

## General Principles

1. **Strong Typing** - Avoid `any`, use explicit types
2. **Immutability** - Prefer `const` over `let`, use readonly
3. **Functional Patterns** - Use pure functions where possible
4. **Error Handling** - Always handle errors explicitly
5. **Async/Await** - Use modern async patterns

---

## Code Style

### Naming Conventions

```typescript
// Interfaces - prefix with 'I'
interface ISessionManager { }

// Classes - PascalCase
class SessionManager implements ISessionManager { }

// Functions - camelCase
function executeCommand(command: string): Promise<void> { }

// Constants - SCREAMING_SNAKE_CASE or camelCase
const MAX_RETRY_ATTEMPTS = 3;
const defaultTimeout = 5000;

// Private fields - prefix with underscore
class Service {
    private _sessionId: string;
}

// Type aliases - PascalCase
type CommandResponse = {
    success: boolean;
    commandId: string;
};

// Enums - PascalCase
enum SessionStatus {
    Idle = "idle",
    Processing = "processing"
}
```

---

## File Organization

```typescript
// imports - grouped and sorted
import * as vscode from 'vscode';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

// types/interfaces
interface CommandRequest {
    sessionId: string;
    command: string;
}

// class implementation
export class HttpServer {
    // private fields
    private readonly _app: express.Express;
    private _server: any;
    
    // constructor
    constructor(private readonly _port: number) {
        this._app = express();
    }
    
    // public methods
    public async start(): Promise<void> {
        // implementation
    }
    
    // private methods
    private setupRoutes(): void {
        // implementation
    }
}
```

---

## TypeScript Features

### Strict Mode

Always enable strict mode in `tsconfig.json`:

```json
{
    "compilerOptions": {
        "strict": true,
        "noImplicitAny": true,
        "strictNullChecks": true,
        "strictFunctionTypes": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true
    }
}
```

### Type Annotations

```typescript
// Explicit function return types
function processCommand(command: string): Promise<CommandResponse> {
    return executeCommandAsync(command);
}

// Object types
interface Session {
    id: string;
    repositoryPath: string;
    status: SessionStatus;
    startedAt: string;
}

// Union types
type Result<T> = Success<T> | Failure;

interface Success<T> {
    kind: 'success';
    value: T;
}

interface Failure {
    kind: 'failure';
    error: string;
}
```

### Null Safety

```typescript
// Use optional chaining
const status = session?.status;

// Use nullish coalescing
const port = config.port ?? 5000;

// Explicit null checks
function getSession(id: string): Session | undefined {
    return sessions.get(id);
}

const session = getSession(sessionId);
if (session) {
    // session is non-null here
    processSession(session);
}
```

### Type Guards

```typescript
function isCommandRequest(obj: any): obj is CommandRequest {
    return typeof obj.sessionId === 'string' &&
           typeof obj.command === 'string';
}

// Usage
if (isCommandRequest(req.body)) {
    // TypeScript knows req.body is CommandRequest
    processCommand(req.body);
}
```

---

## Async/Await

```typescript
// Always use async/await, not callbacks or raw promises
// Bad:
function fetchData() {
    return fetch(url).then(res => res.json()).then(data => {
        return data;
    });
}

// Good:
async function fetchData(): Promise<Data> {
    const response = await fetch(url);
    const data = await response.json();
    return data;
}

// Error handling with try/catch
async function executeCommand(command: string): Promise<void> {
    try {
        const result = await languageModel.sendRequest(command);
        await processResult(result);
    } catch (error) {
        logger.error('Command execution failed', error);
        throw new CommandExecutionError('Failed to execute command', error);
    }
}
```

---

## Error Handling

```typescript
// Custom error classes
class CommandExecutionError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly cause?: Error
    ) {
        super(message);
        this.name = 'CommandExecutionError';
    }
}

// Result type pattern (alternative to exceptions)
type Result<T, E = Error> = 
    | { success: true; value: T }
    | { success: false; error: E };

async function trySendCommand(command: string): Promise<Result<string>> {
    try {
        const result = await sendCommand(command);
        return { success: true, value: result };
    } catch (error) {
        return { success: false, error: error as Error };
    }
}
```

---

## Express.js Patterns

```typescript
// Type-safe request handlers
import { Request, Response, NextFunction } from 'express';

interface StartSessionRequest {
    repositoryPath: string;
}

app.post('/session/start', async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Validate request body
        if (!isStartSessionRequest(req.body)) {
            res.status(400).json({ error: 'Invalid request' });
            return;
        }
        
        const session = await startSession(req.body.repositoryPath);
        res.status(201).json({ success: true, session });
    } catch (error) {
        next(error); // Pass to error handler
    }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('Request failed', err);
    
    if (err instanceof CommandExecutionError) {
        res.status(500).json({
            error: err.message,
            code: err.code
        });
    } else {
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});
```

---

## VS Code API Patterns

```typescript
// Extension activation
export function activate(context: vscode.ExtensionContext): void {
    const disposables: vscode.Disposable[] = [];
    
    // Register commands
    disposables.push(
        vscode.commands.registerCommand('remoteVibe.startServer', async () => {
            await startServer();
        })
    );
    
    // Add to subscriptions for cleanup
    context.subscriptions.push(...disposables);
}

// Language Model API usage
async function callLanguageModel(prompt: string): Promise<string> {
    const models = await vscode.lm.selectChatModels({
        vendor: 'copilot',
        family: 'gpt-4o'
    });
    
    if (models.length === 0) {
        throw new Error('No language model available');
    }
    
    const model = models[0];
    const messages = [
        vscode.LanguageModelChatMessage.User(prompt)
    ];
    
    const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
    
    let fullText = '';
    for await (const chunk of response.text) {
        fullText += chunk;
    }
    
    return fullText;
}
```

---

## Code Organization

### Single Responsibility

```typescript
// Bad - class does too much
class SessionHandler {
    startSession() { }
    sendCommand() { }
    parseResponse() { }
    detectQuestion() { }
    saveToDatabase() { }
}

// Good - separate concerns
class SessionManager {
    startSession() { }
    stopSession() { }
}

class CommandExecutor {
    executeCommand() { }
}

class ResponseParser {
    parseResponse() { }
}

class QuestionDetector {
    detectQuestion() { }
}
```

### Dependency Injection

```typescript
// Use constructor injection
class HttpServer {
    constructor(
        private readonly sessionManager: SessionManager,
        private readonly languageModelService: LanguageModelService,
        private readonly logger: Logger
    ) {}
}

// Factory pattern
function createHttpServer(
    sessionManager: SessionManager,
    languageModelService: LanguageModelService
): HttpServer {
    const logger = createLogger();
    return new HttpServer(sessionManager, languageModelService, logger);
}
```

---

## Testing

```typescript
// Use descriptive test names
describe('QuestionDetector', () => {
    let detector: QuestionDetector;
    
    beforeEach(() => {
        detector = new QuestionDetector();
    });
    
    it('should detect yes/no question', () => {
        const text = 'Do you want to continue? (yes/no)';
        const result = detector.detect(text);
        
        expect(result).not.toBeNull();
        expect(result?.type).toBe('yes_no');
    });
    
    it('should return null for non-question text', () => {
        const text = 'This is a statement.';
        const result = detector.detect(text);
        
        expect(result).toBeNull();
    });
});
```

---

## Logging

```typescript
// Structured logging
class Logger {
    info(message: string, context?: Record<string, any>): void {
        console.log(JSON.stringify({
            level: 'info',
            message,
            timestamp: new Date().toISOString(),
            ...context
        }));
    }
    
    error(message: string, error: Error, context?: Record<string, any>): void {
        console.error(JSON.stringify({
            level: 'error',
            message,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            timestamp: new Date().toISOString(),
            ...context
        }));
    }
}

// Usage
logger.info('Session started', { sessionId: session.id });
logger.error('Command failed', error, { commandId: command.id });
```

---

## Performance

```typescript
// Use const for immutable values
const MAX_SESSIONS = 10;

// Use readonly for class fields that don't change
class Config {
    readonly port: number = 5000;
}

// Avoid creating functions in loops
// Bad:
items.forEach(item => {
    setTimeout(() => processItem(item), 1000);
});

// Good:
const processItemDelayed = (item: Item) => {
    setTimeout(() => processItem(item), 1000);
};
items.forEach(processItemDelayed);

// Use Map/Set instead of objects for large collections
const sessions = new Map<string, Session>();
```

---

## Code Review Checklist

- [ ] All types explicitly declared (no `any`)
- [ ] Null checks in place
- [ ] Error handling with try/catch
- [ ] Async functions use async/await
- [ ] No unused imports or variables
- [ ] Functions have single responsibility
- [ ] Descriptive variable and function names
- [ ] Comments explain "why", not "what"
- [ ] No console.log in production code (use logger)
- [ ] Tests written for critical logic

---

## tsconfig.json

```json
{
    "compilerOptions": {
        "target": "ES2020",
        "lib": ["ES2020"],
        "module": "commonjs",
        "outDir": "./out",
        "rootDir": "./src",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "noImplicitAny": true,
        "strictNullChecks": true,
        "strictFunctionTypes": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "noImplicitReturns": true,
        "noFallthroughCasesInSwitch": true,
        "moduleResolution": "node",
        "resolveJsonModule": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "out"]
}
```

---

## ESLint Configuration

```json
{
    "parser": "@typescript-eslint/parser",
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended"
    ],
    "rules": {
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/explicit-function-return-type": "warn",
        "@typescript-eslint/no-unused-vars": "error",
        "no-console": "warn"
    }
}
```

---

## References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Express.js TypeScript](https://expressjs.com/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)


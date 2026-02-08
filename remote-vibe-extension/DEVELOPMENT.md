# Remote Vibe Extension - Development Guide

## ✅ Project Structure Created

The VS Code extension has been successfully scaffolded with the following structure:

```
remote-vibe-extension/
├── .vscode/
│   ├── launch.json          # Debug configuration
│   ├── settings.json        # Workspace settings
│   └── tasks.json           # Build tasks
├── src/
│   ├── extension.ts         # Main entry point
│   ├── config.ts            # Configuration management
│   ├── server/
│   │   ├── httpServer.ts    # Express server setup
│   │   ├── routes.ts        # API route handlers
│   │   └── middleware.ts    # Auth, CORS, error handling
│   ├── services/
│   │   ├── languageModelService.ts  # Language Model API wrapper
│   │   ├── sessionManager.ts        # Session state management
│   │   ├── questionDetector.ts      # Detect questions in LLM output
│   │   └── contextBuilder.ts        # Build context for LLM
│   ├── types/
│   │   ├── session.ts       # Session types
│   │   ├── messages.ts      # Message types
│   │   ├── questions.ts     # Question types
│   │   └── commands.ts      # Command types
│   └── utils/
│       ├── logger.ts        # Logging utility
│       └── validator.ts     # Input validation
├── package.json             # Extension manifest
├── tsconfig.json            # TypeScript configuration
├── .eslintrc.js            # ESLint configuration
├── .gitignore
├── .vscodeignore
└── README.md

## 🚀 Next Steps

### 1. Install Dependencies

```bash
cd remote-vibe-extension
npm install
```

### 2. Compile the Extension

```bash
npm run compile
```

Or watch for changes:

```bash
npm run watch
```

### 3. Run the Extension

1. Open the `remote-vibe-extension` folder in VS Code
2. Press `F5` to launch the Extension Development Host
3. The extension will automatically start the HTTP server on port 5000
4. Check the "Remote Vibe" output channel for logs

### 4. Test the API

Start a session:
```bash
curl -X POST http://localhost:5000/extension/session/start \
  -H "Content-Type: application/json" \
  -d '{"repositoryPath": "/Users/hampus/Dev/remote-vibe"}'
```

Execute a command:
```bash
curl -X POST http://localhost:5000/extension/command \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "SESSION_ID_FROM_ABOVE",
    "command": "What files are in this repository?",
    "context": {
      "includeWorkspace": true
    }
  }'
```

Check session status:
```bash
curl http://localhost:5000/extension/session/SESSION_ID/status
```

Get messages:
```bash
curl http://localhost:5000/extension/session/SESSION_ID/messages
```

Health check:
```bash
curl http://localhost:5000/extension/health
```

## 📋 Key Features Implemented

✅ **Extension Entry Point** (`extension.ts`)
- Activation on VS Code startup
- Commands for start/stop/status
- Auto-start configuration support

✅ **HTTP Server** (`server/httpServer.ts`)
- Express.js server on configurable port
- CORS enabled
- Graceful startup/shutdown

✅ **API Routes** (`server/routes.ts`)
- POST /extension/session/start
- POST /extension/command
- POST /extension/respond
- GET /extension/session/:sessionId/status
- GET /extension/session/:sessionId/messages
- DELETE /extension/session/:sessionId
- GET /extension/health

✅ **Middleware** (`server/middleware.ts`)
- Bearer token authentication (optional)
- Error handling
- Request logging

✅ **Session Manager** (`services/sessionManager.ts`)
- In-memory session storage
- Message history tracking
- Pending question management
- Session lifecycle management

✅ **Language Model Service** (`services/languageModelService.ts`)
- VS Code Language Model API integration
- GitHub Copilot (gpt-4o) support
- Command execution with context
- Response streaming
- Question detection and handling

✅ **Question Detector** (`services/questionDetector.ts`)
- Yes/No question detection
- Multiple choice detection
- Confirmation detection
- Free text detection
- Option extraction

✅ **Context Builder** (`services/contextBuilder.ts`)
- Workspace structure inclusion
- File content inclusion
- Repository path context

✅ **Type Definitions** (`types/`)
- Strong typing for all DTOs
- Session, Message, Question, Command types
- Matches SHARED_CONTRACTS.md specification

✅ **Utilities**
- Logger with output channel
- Input validation
- Configuration management

## 🔧 Configuration

The extension can be configured via VS Code settings:

```json
{
  "remoteVibe.port": 5000,
  "remoteVibe.authToken": "your-secret-token",
  "remoteVibe.autoStart": true
}
```

## 🎯 Usage

### Commands (Command Palette)

- `Remote Vibe: Start Server` - Start the HTTP server
- `Remote Vibe: Stop Server` - Stop the HTTP server
- `Remote Vibe: Show Status` - Show server status and active sessions

### API Flow

1. **Start Session**: Create a new session for a repository
2. **Execute Command**: Send a command to the Language Model
3. **Monitor Status**: Check if session is processing or waiting for input
4. **Respond to Questions**: Answer any questions detected by the AI
5. **Get Messages**: Retrieve conversation history
6. **Delete Session**: Clean up when done

## 📦 Building for Distribution

Package the extension:

```bash
npm install -g vsce
vsce package
```

This creates a `.vsix` file that can be installed in VS Code.

## 🐛 Debugging

1. Set breakpoints in the TypeScript source files
2. Press F5 to launch Extension Development Host
3. Breakpoints will be hit when API endpoints are called
4. Check the Debug Console for output

## 📝 Notes

- Requires GitHub Copilot extension to be installed and active
- Language Model API is only available in VS Code 1.85.0+
- The extension uses the `copilot` vendor and `gpt-4o` family by default
- All sessions are stored in memory and lost on extension reload

## 🔗 Integration

This extension is designed to work with:

- **Backend Service** (ASP.NET Core) - Proxies requests and adds SignalR
- **Mobile App** (.NET MAUI) - User interface for sending commands

See `EXTENSION_SPEC.md` and `SHARED_CONTRACTS.md` in the design folder for complete specifications.

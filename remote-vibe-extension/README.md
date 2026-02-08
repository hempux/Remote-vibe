# Remote Vibe Extension

VS Code extension that exposes the Language Model API via HTTP for remote control from mobile devices.

## Features

- Expose HTTP REST API on port 5000 (configurable)
- Interface with VS Code Language Model API (GitHub Copilot)
- Manage AI command execution and response streaming
- Detect questions from Language Model responses
- Provide workspace context to Language Model
- Handle session state and lifecycle

## Requirements

- VS Code 1.85.0 or higher
- GitHub Copilot extension installed and active
- Node.js 18+

## Extension Settings

This extension contributes the following settings:

- `remoteVibe.port`: HTTP server port (default: 5000)
- `remoteVibe.authToken`: Authentication token for API requests
- `remoteVibe.autoStart`: Automatically start server on extension activation (default: true)

## Commands

- `Remote Vibe: Start Server` - Start the HTTP server
- `Remote Vibe: Stop Server` - Stop the HTTP server
- `Remote Vibe: Show Status` - Show server status and active sessions

## API Endpoints

### POST /extension/session/start
Start a new session for a repository.

**Request:**
```json
{
  "repositoryPath": "/path/to/repo"
}
```

### POST /extension/command
Execute a command in a session.

**Request:**
```json
{
  "sessionId": "uuid",
  "command": "Create a new React component",
  "context": {
    "includeFiles": ["src/App.tsx"],
    "includeWorkspace": true
  }
}
```

### POST /extension/respond
Respond to a pending question.

**Request:**
```json
{
  "questionId": "uuid",
  "answer": "yes"
}
```

### GET /extension/session/:sessionId/status
Get session status and pending question.

### GET /extension/session/:sessionId/messages
Get all messages in a session.

### DELETE /extension/session/:sessionId
Delete a session.

### GET /extension/health
Health check endpoint.

## Development

### Setup

```bash
npm install
npm run compile
```

### Run Extension

1. Press F5 to launch Extension Development Host
2. The extension will automatically start the HTTP server
3. Check the "Remote Vibe" output channel for logs

### Testing

```bash
curl -X POST http://localhost:5000/extension/session/start \
  -H "Content-Type: application/json" \
  -d '{"repositoryPath": "/path/to/repo"}'
```

## Release Notes

### 0.1.0

Initial release of Remote Vibe Extension.

## License

MIT

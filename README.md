# Remote Vibe Extension

VS Code extension that exposes the Language Model API via HTTP for remote control from mobile devices.

## Features

- 🚀 HTTP REST API on configurable port (default: 5000)
- 🤖 Integration with VS Code Language Model API (GitHub Copilot)
- 💬 Conversation session management
- ❓ Automatic question detection from AI responses
- 🔐 Token-based authentication
- 📝 Comprehensive logging

## Requirements

- VS Code 1.85.0 or higher
- GitHub Copilot subscription (for Language Model API access)
- Node.js 18+ (for development)

## Installation

### From Source

1. Clone the repository
2. Run `npm install`
3. Run `npm run compile`
4. Press F5 to launch Extension Development Host

## Configuration

The extension can be configured via VS Code settings:

```json
{
  "remoteVibe.extensionPort": 5000,
  "remoteVibe.backendUrl": "http://localhost:5001",
  "remoteVibe.autoStart": false,
  "remoteVibe.logLevel": "info",
  "remoteVibe.authToken": "your-secret-token"
}
```

## Usage

### Starting the Server

1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Run `Remote Vibe: Start Server`
3. The status bar will show the server status and port

### API Endpoints

#### Start Session
```bash
POST http://localhost:5000/extension/session/start
Authorization: Bearer your-token
Content-Type: application/json

{
  "repositoryPath": "/path/to/your/repo"
}
```

#### Send Command
```bash
POST http://localhost:5000/extension/command
Authorization: Bearer your-token
Content-Type: application/json

{
  "sessionId": "session-uuid",
  "command": "Create a React component",
  "context": {
    "includeFiles": ["src/App.tsx"],
    "includeWorkspace": true
  }
}
```

#### Respond to Question
```bash
POST http://localhost:5000/extension/respond
Authorization: Bearer your-token
Content-Type: application/json

{
  "questionId": "question-uuid",
  "answer": "yes",
  "timestamp": "2026-02-08T15:00:00Z"
}
```

#### Get Session Status
```bash
GET http://localhost:5000/extension/session/:sessionId/status
Authorization: Bearer your-token
```

#### Get Messages
```bash
GET http://localhost:5000/extension/session/:sessionId/messages
Authorization: Bearer your-token
```

#### Delete Session
```bash
DELETE http://localhost:5000/extension/session/:sessionId
Authorization: Bearer your-token
```

#### Health Check
```bash
GET http://localhost:5000/extension/health
Authorization: Bearer your-token
```

## Architecture

```
src/
├── extension.ts              # Extension entry point
├── config.ts                 # Configuration management
├── server/
│   ├── httpServer.ts        # Express server
│   ├── routes.ts            # API routes
│   └── middleware.ts        # Auth & error handling
├── services/
│   ├── languageModelService.ts   # LLM integration
│   ├── sessionManager.ts         # Session state
│   ├── questionDetector.ts       # Question detection
│   └── contextBuilder.ts         # Context building
├── types/
│   ├── session.ts           # Session types
│   ├── messages.ts          # Message types
│   ├── questions.ts         # Question types
│   ├── commands.ts          # Command types
│   └── errors.ts            # Error types
└── utils/
    ├── logger.ts            # Logging utility
    └── validator.ts         # Input validation
```

## Development

### Compile
```bash
npm run compile
```

### Watch Mode
```bash
npm run watch
```

### Lint
```bash
npm run lint
```

### Debug
Press F5 in VS Code to launch the Extension Development Host

## Testing

Example test with curl:

```bash
# Start a session
curl -X POST http://localhost:5000/extension/session/start \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{"repositoryPath": "/Users/you/project"}'

# Send a command
curl -X POST http://localhost:5000/extension/command \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "your-session-id",
    "command": "Explain what this project does"
  }'

# Check status
curl http://localhost:5000/extension/session/your-session-id/status \
  -H "Authorization: Bearer test-token"
```

## Troubleshooting

### Server won't start
- Check if port 5000 is already in use
- Verify VS Code has necessary permissions
- Check the Output panel (View → Output → Remote Vibe)

### Language Model errors
- Ensure GitHub Copilot is installed and active
- Check your Copilot subscription status
- Verify you're logged into GitHub in VS Code

### Authentication errors
- Verify the `authToken` setting matches your requests
- Check the `Authorization` header format: `Bearer <token>`

## License

See LICENSE file for details.

## Contributing

Contributions are welcome! Please read the contributing guidelines first.

## Related Projects

- Backend Service: Orchestrates communication between extension and mobile app
- Mobile App: iOS/Android app for remote control

## Support

For issues and questions, please use the GitHub issue tracker.

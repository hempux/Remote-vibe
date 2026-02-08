# VS Code Extension Specification

## Project Overview

**Project Name:** Remote Vibe Extension  
**Language:** TypeScript  
**Runtime:** VS Code Extension Host  
**Purpose:** Expose VS Code's Language Model API via HTTP to enable remote control from mobile devices

### Core Responsibilities

1. Expose HTTP REST API for external clients (backend service)
2. Interface with VS Code Language Model API (GitHub Copilot)
3. Manage AI command execution and response streaming
4. Detect questions from Language Model responses
5. Provide workspace context to Language Model
6. Handle session state and lifecycle

---

## Technology Stack

- **TypeScript** 5.x
- **VS Code Extension API** 1.85+
- **Language Model API** (`vscode.lm`)
- **Express.js** 4.x (HTTP server)
- **Node.js** 18+ (runtime)

### Key Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "body-parser": "^1.20.2",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "@types/node": "^18.x",
    "@types/express": "^4.17.17",
    "typescript": "^5.3.0",
    "vscode-test": "^1.6.1",
    "eslint": "^8.50.0",
    "@typescript-eslint/parser": "^6.7.0"
  }
}
```

---

## Project Structure

```
remote-vibe-extension/
├── .vscode/
│   ├── launch.json              # Debug configuration
│   └── settings.json            # Workspace settings
├── src/
│   ├── extension.ts             # Main entry point
│   ├── server/
│   │   ├── httpServer.ts        # Express server setup
│   │   ├── routes.ts            # API route handlers
│   │   └── middleware.ts        # Auth, CORS, error handling
│   ├── services/
│   │   ├── languageModelService.ts  # Language Model API wrapper
│   │   ├── sessionManager.ts        # Session state management
│   │   ├── questionDetector.ts      # Detect questions in LLM output
│   │   └── contextBuilder.ts        # Build context for LLM
│   ├── types/
│   │   ├── session.ts           # Session types
│   │   ├── messages.ts          # Message types
│   │   ├── questions.ts         # Question types
│   │   └── commands.ts          # Command types
│   ├── utils/
│   │   ├── logger.ts            # Logging utility
│   │   └── validator.ts         # Input validation
│   └── config.ts                # Configuration management
├── package.json
├── tsconfig.json
├── README.md
└── .vscodeignore
```

See SHARED_CONTRACTS.md for all DTOs and API endpoint specifications.

---

## Component Implementation Guide

### Extension Entry Point

All activation logic, HTTP server startup, and cleanup.

### HTTP Server

Express.js server on port 5000 with CORS, auth middleware, and error handling.

### Language Model Service

- Call vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' })
- Build prompts from conversation history + context
- Stream responses and detect questions
- Handle errors and timeouts

### Question Detector

Regex patterns to detect:
- Yes/No questions (contains "?" and "yes/no")
- Multiple choice (numbered/bulleted options)
- Confirmations ("are you sure", "would you like")

### Session Manager

In-memory Map storage for sessions, messages, and pending questions.

---

## API Endpoints

See SHARED_CONTRACTS.md for complete API specification.

**Summary:**
- POST /extension/session/start
- POST /extension/command
- POST /extension/respond
- GET /extension/session/:sessionId/status
- GET /extension/session/:sessionId/messages
- DELETE /extension/session/:sessionId
- GET /extension/health

---

## Acceptance Criteria

- [ ] Extension activates without errors
- [ ] HTTP server starts on port 5000
- [ ] All API endpoints respond correctly per SHARED_CONTRACTS.md
- [ ] Can call Language Model API successfully
- [ ] Questions are detected in LLM responses
- [ ] Session state is maintained correctly
- [ ] Errors return proper error codes
- [ ] Extension deactivates cleanly
- [ ] No memory leaks during long sessions

---

## Development Setup

```bash
npm install
npm run compile
# Press F5 to launch Extension Development Host
```

## Testing

```bash
curl -X POST http://localhost:5000/extension/session/start \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{"repositoryPath": "/path/to/repo"}'
```


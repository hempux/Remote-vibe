# Remote Vibe Backend

ASP.NET Core backend service that wraps GitHub Copilot CLI for remote control from mobile devices.

## Prerequisites

- .NET 10 SDK
- GitHub CLI (`gh`) installed and authenticated
- GitHub Copilot subscription with CLI access

## Installation

```bash
# Install GitHub CLI (if not already installed)
# macOS
brew install gh

# Authenticate with GitHub
gh auth login

# Install GitHub Copilot CLI extension
gh extension install github/gh-copilot
```

## Running the Backend

```bash
cd backend
dotnet run
```

The backend will start on:
- HTTP: http://localhost:5000
- HTTPS: https://localhost:5001

## API Endpoints

### REST API

- `POST /api/session/start` - Start a new Copilot session
- `POST /api/session/{id}/command` - Send command to session
- `POST /api/session/{id}/respond` - Respond to pending question
- `GET /api/session/{id}/status` - Get session status
- `GET /api/session/{id}/history` - Get conversation history
- `DELETE /api/session/{id}` - Stop session
- `GET /api/health` - Health check

### SignalR Hub

- WebSocket endpoint: `/hubs/copilot`

**Hub Methods (Client → Server):**
- `JoinSession(sessionId)` - Join a session group
- `LeaveSession(sessionId)` - Leave a session group
- `SendHeartbeat()` - Send heartbeat

**Hub Events (Server → Client):**
- `OnMessageReceived(message)` - New message in conversation
- `OnQuestionPending(question)` - Question requiring user input
- `OnSessionStatusChanged(status)` - Session status changed
- `OnTaskCompleted(result)` - Task completed
- `OnError(error)` - Error occurred

## Project Structure

```
backend/
├── Controllers/
│   ├── SessionController.cs    # REST API endpoints
│   └── HealthController.cs     # Health check endpoint
├── Hubs/
│   └── CopilotHub.cs           # SignalR hub
├── Services/
│   ├── SessionManager.cs       # Session state management
│   ├── CopilotCliService.cs    # GitHub Copilot CLI wrapper
│   └── NotificationService.cs  # Push notifications (stub)
├── Models/
│   ├── Session.cs              # Session entity
│   ├── ConversationMessage.cs  # Message entity
│   ├── PendingQuestion.cs      # Question entity
│   └── Notification.cs         # Notification entity
├── DTOs/
│   └── SessionDTOs.cs          # Data transfer objects
└── Program.cs                  # Application entry point
```

## Configuration

Edit `appsettings.Development.json` to configure logging levels and other settings.

## Logging

Logs are written to:
- Console (stdout)
- File: `logs/remotevibe-YYYYMMDD.txt`

## Example Usage

### Start a session

```bash
curl -X POST http://localhost:5000/api/session/start \
  -H "Content-Type: application/json" \
  -d '{"repositoryPath": "/path/to/your/repo"}'
```

### Send a command

```bash
curl -X POST http://localhost:5000/api/session/{sessionId}/command \
  -H "Content-Type: application/json" \
  -d '{"command": "Add a README file to this project"}'
```

### Get session status

```bash
curl http://localhost:5000/api/session/{sessionId}/status
```

## Development

### Build

```bash
dotnet build
```

### Run tests (when implemented)

```bash
dotnet test
```

### Run in watch mode

```bash
dotnet watch run
```

## TODO

- [ ] Implement FCM/APNS push notifications
- [ ] Add authentication/authorization
- [ ] Add session persistence (database)
- [ ] Add rate limiting
- [ ] Add comprehensive error handling
- [ ] Add unit and integration tests
- [ ] Add Docker support
- [ ] Add systemd service configuration

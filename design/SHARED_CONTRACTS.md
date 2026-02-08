# Shared Contracts and DTOs

## Overview
This document defines all shared data contracts, DTOs, and API specifications used across the VS Code Extension, Backend Service, and Mobile App. These contracts ensure independent development of each component.

---

## Data Transfer Objects (DTOs)

### Session DTOs

```typescript
// TypeScript (Extension)
interface Session {
    id: string;
    repositoryPath: string;
    status: SessionStatus;
    startedAt: string;  // ISO 8601
    lastActivityAt: string | null;  // ISO 8601
    currentCommand: string | null;
}

enum SessionStatus {
    Idle = "idle",
    Processing = "processing",
    WaitingForInput = "waiting_for_input",
    Completed = "completed",
    Error = "error"
}
```

```csharp
// C# (Backend & Mobile)
public class Session
{
    public string Id { get; set; } = string.Empty;
    public string RepositoryPath { get; set; } = string.Empty;
    public SessionStatus Status { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? LastActivityAt { get; set; }
    public string? CurrentCommand { get; set; }
}

public enum SessionStatus
{
    Idle,
    Processing,
    WaitingForInput,
    Completed,
    Error
}
```

### Command DTOs

```typescript
// TypeScript (Extension)
interface CommandRequest {
    sessionId: string;
    command: string;
    context?: {
        includeFiles?: string[];  // File paths to include in context
        includeWorkspace?: boolean;
    };
}

interface CommandResponse {
    success: boolean;
    commandId: string;
    status: string;  // "accepted", "rejected", "error"
    message?: string;
}
```

```csharp
// C# (Backend & Mobile)
public record CommandRequest(
    string SessionId,
    string Command,
    CommandContext? Context = null
);

public record CommandContext(
    List<string>? IncludeFiles = null,
    bool IncludeWorkspace = false
);

public record CommandResponse(
    bool Success,
    string CommandId,
    string Status,
    string? Message = null
);
```

### Conversation Message DTOs

```typescript
// TypeScript (Extension)
interface ConversationMessage {
    id: string;
    sessionId: string;
    role: MessageRole;
    content: string;
    timestamp: string;  // ISO 8601
    metadata?: {
        filesChanged?: string[];
        commandId?: string;
    };
}

enum MessageRole {
    User = "user",
    Assistant = "assistant",
    System = "system"
}
```

```csharp
// C# (Backend & Mobile)
public class ConversationMessage
{
    public string Id { get; set; } = string.Empty;
    public string SessionId { get; set; } = string.Empty;
    public MessageRole Role { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public MessageMetadata? Metadata { get; set; }
}

public enum MessageRole
{
    User,
    Assistant,
    System
}

public class MessageMetadata
{
    public List<string>? FilesChanged { get; set; }
    public string? CommandId { get; set; }
}
```

### Question DTOs

```typescript
// TypeScript (Extension)
interface PendingQuestion {
    id: string;
    sessionId: string;
    question: string;
    questionType: QuestionType;
    options?: string[];  // For multiple choice questions
    timestamp: string;  // ISO 8601
}

enum QuestionType {
    YesNo = "yes_no",
    MultipleChoice = "multiple_choice",
    FreeText = "free_text",
    Confirmation = "confirmation"
}

interface QuestionResponse {
    questionId: string;
    answer: string;
    timestamp: string;  // ISO 8601
}
```

```csharp
// C# (Backend & Mobile)
public class PendingQuestion
{
    public string Id { get; set; } = string.Empty;
    public string SessionId { get; set; } = string.Empty;
    public string Question { get; set; } = string.Empty;
    public QuestionType QuestionType { get; set; }
    public List<string>? Options { get; set; }
    public DateTime Timestamp { get; set; }
}

public enum QuestionType
{
    YesNo,
    MultipleChoice,
    FreeText,
    Confirmation
}

public record QuestionResponse(
    string QuestionId,
    string Answer,
    DateTime Timestamp
);
```

### Notification DTOs

```csharp
// C# only (Backend & Mobile)
public class NotificationRequest
{
    public string DeviceToken { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public NotificationType Type { get; set; }
    public Dictionary<string, string>? Data { get; set; }
}

public enum NotificationType
{
    QuestionPending,
    TaskCompleted,
    TaskFailed,
    SessionStarted,
    SessionStopped
}

public record DeviceRegistration(
    string DeviceToken,
    string Platform,  // "ios" or "android"
    DateTime RegisteredAt
);
```

### Error DTOs

```typescript
// TypeScript (Extension)
interface ErrorResponse {
    error: string;
    code: string;
    details?: any;
    timestamp: string;  // ISO 8601
}
```

```csharp
// C# (Backend & Mobile)
public record ErrorResponse(
    string Error,
    string Code,
    object? Details = null,
    DateTime? Timestamp = null
);
```

---

## API Contracts

## Extension HTTP API (TypeScript → C# Backend)

The VS Code extension exposes an HTTP API on `http://localhost:5000` (configurable).

### POST /extension/session/start

**Request:**
```json
{
    "repositoryPath": "/path/to/repo"
}
```

**Response:**
```json
{
    "success": true,
    "session": {
        "id": "uuid",
        "repositoryPath": "/path/to/repo",
        "status": "idle",
        "startedAt": "2026-02-08T15:00:00Z",
        "lastActivityAt": null,
        "currentCommand": null
    }
}
```

### POST /extension/command

**Request:**
```json
{
    "sessionId": "uuid",
    "command": "Create a new React component called UserProfile",
    "context": {
        "includeFiles": ["src/App.tsx"],
        "includeWorkspace": true
    }
}
```

**Response:**
```json
{
    "success": true,
    "commandId": "uuid",
    "status": "accepted",
    "message": "Command queued for processing"
}
```

### POST /extension/respond

**Request:**
```json
{
    "questionId": "uuid",
    "answer": "yes",
    "timestamp": "2026-02-08T15:05:00Z"
}
```

**Response:**
```json
{
    "success": true,
    "status": "accepted"
}
```

### GET /extension/session/:sessionId/status

**Response:**
```json
{
    "session": {
        "id": "uuid",
        "repositoryPath": "/path/to/repo",
        "status": "processing",
        "startedAt": "2026-02-08T15:00:00Z",
        "lastActivityAt": "2026-02-08T15:04:30Z",
        "currentCommand": "Create React component"
    },
    "pendingQuestions": [
        {
            "id": "uuid",
            "sessionId": "uuid",
            "question": "Should I use TypeScript?",
            "questionType": "yes_no",
            "options": null,
            "timestamp": "2026-02-08T15:04:00Z"
        }
    ]
}
```

### GET /extension/session/:sessionId/messages

**Response:**
```json
{
    "messages": [
        {
            "id": "uuid",
            "sessionId": "uuid",
            "role": "user",
            "content": "Create a React component",
            "timestamp": "2026-02-08T15:00:00Z",
            "metadata": null
        },
        {
            "id": "uuid",
            "sessionId": "uuid",
            "role": "assistant",
            "content": "I'll create a UserProfile component...",
            "timestamp": "2026-02-08T15:00:05Z",
            "metadata": {
                "filesChanged": ["src/components/UserProfile.tsx"],
                "commandId": "uuid"
            }
        }
    ]
}
```

### DELETE /extension/session/:sessionId

**Response:**
```json
{
    "success": true,
    "message": "Session stopped"
}
```

### GET /extension/health

**Response:**
```json
{
    "status": "healthy",
    "version": "1.0.0",
    "extensionActive": true,
    "activeSession": "uuid"
}
```

---

## Backend REST API (Mobile → C# Backend)

The backend exposes a REST API on `https://localhost:5001` (configurable).

### POST /api/session/start

**Request:**
```json
{
    "repositoryPath": "/path/to/repo"
}
```

**Response:**
```json
{
    "sessionId": "uuid",
    "status": "started",
    "session": {
        "id": "uuid",
        "repositoryPath": "/path/to/repo",
        "status": "idle",
        "startedAt": "2026-02-08T15:00:00Z",
        "lastActivityAt": null,
        "currentCommand": null
    }
}
```

### POST /api/session/{sessionId}/command

**Request:**
```json
{
    "command": "Create a new React component",
    "context": {
        "includeFiles": ["src/App.tsx"],
        "includeWorkspace": true
    }
}
```

**Response:**
```json
{
    "success": true,
    "commandId": "uuid",
    "status": "accepted"
}
```

### POST /api/session/{sessionId}/respond

**Request:**
```json
{
    "questionId": "uuid",
    "answer": "yes"
}
```

**Response:**
```json
{
    "success": true
}
```

### GET /api/session/{sessionId}/status

**Response:**
```json
{
    "session": {
        "id": "uuid",
        "repositoryPath": "/path/to/repo",
        "status": "processing",
        "startedAt": "2026-02-08T15:00:00Z",
        "lastActivityAt": "2026-02-08T15:04:30Z",
        "currentCommand": "Create React component"
    },
    "pendingQuestions": [],
    "messageCount": 5
}
```

### GET /api/session/{sessionId}/messages

**Query Parameters:**
- `skip` (optional): Number of messages to skip
- `take` (optional): Number of messages to return (default: 50)

**Response:**
```json
{
    "messages": [...],
    "total": 100,
    "hasMore": true
}
```

### DELETE /api/session/{sessionId}

**Response:**
```json
{
    "success": true
}
```

### POST /api/notifications/register

**Request:**
```json
{
    "deviceToken": "fcm-or-apns-token",
    "platform": "ios"
}
```

**Response:**
```json
{
    "success": true,
    "registered": true
}
```

### GET /api/health

**Response:**
```json
{
    "status": "healthy",
    "extensionConnected": true,
    "extensionUrl": "http://localhost:5000",
    "activeSession": "uuid"
}
```

---

## SignalR Hub (Backend ↔ Mobile)

Hub URL: `wss://localhost:5001/hubs/remotevibe`

### Server to Client Methods

```csharp
// Called by backend, received by mobile
Task OnSessionStatusChanged(Session session);
Task OnMessageReceived(ConversationMessage message);
Task OnQuestionPending(PendingQuestion question);
Task OnTaskCompleted(TaskCompletedEvent eventData);
Task OnTaskFailed(TaskFailedEvent eventData);
Task OnConnectionStatusChanged(ConnectionStatus status);
```

**TaskCompletedEvent:**
```csharp
public record TaskCompletedEvent(
    string SessionId,
    string CommandId,
    string Summary,
    List<string> FilesChanged,
    DateTime CompletedAt
);
```

**TaskFailedEvent:**
```csharp
public record TaskFailedEvent(
    string SessionId,
    string CommandId,
    string Error,
    string? Details,
    DateTime FailedAt
);
```

**ConnectionStatus:**
```csharp
public record ConnectionStatus(
    bool ExtensionConnected,
    bool SessionActive,
    string? Message
);
```

### Client to Server Methods

```csharp
// Called by mobile, handled by backend
Task JoinSession(string sessionId);
Task LeaveSession(string sessionId);
Task SendHeartbeat();
Task RequestSync();  // Request full state sync
```

---

## Extension Internal Events (TypeScript)

The extension emits internal events that trigger backend communication:

```typescript
// Extension event handlers
interface ExtensionEvents {
    onLanguageModelResponse(response: LanguageModelResponse): void;
    onQuestionDetected(question: PendingQuestion): void;
    onTaskCompleted(result: TaskResult): void;
    onError(error: ErrorInfo): void;
}

interface LanguageModelResponse {
    commandId: string;
    text: string;
    isComplete: boolean;
    metadata?: {
        filesModified?: string[];
        questionAsked?: boolean;
    };
}

interface TaskResult {
    commandId: string;
    success: boolean;
    summary: string;
    filesChanged: string[];
}

interface ErrorInfo {
    code: string;
    message: string;
    commandId?: string;
}
```

---

## HTTP Headers

All HTTP requests should include:

```
Authorization: Bearer <token>
Content-Type: application/json
X-API-Version: 1.0
```

For the MVP, the token can be a simple shared secret. Future: JWT tokens.

---

## Status Codes

Standard HTTP status codes:

- `200 OK` - Successful request
- `201 Created` - Resource created (session started)
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing/invalid authentication
- `404 Not Found` - Session/resource not found
- `409 Conflict` - Session already exists
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Extension not connected

---

## WebSocket Message Format (SignalR)

SignalR uses JSON with the following structure:

```json
{
    "type": 1,
    "target": "OnMessageReceived",
    "arguments": [
        {
            "id": "uuid",
            "sessionId": "uuid",
            "role": "assistant",
            "content": "...",
            "timestamp": "2026-02-08T15:00:00Z"
        }
    ]
}
```

---

## Configuration Contracts

### Extension Configuration (settings.json)

```json
{
    "remoteVibe.extensionPort": 5000,
    "remoteVibe.backendUrl": "http://localhost:5001",
    "remoteVibe.autoStart": false,
    "remoteVibe.logLevel": "info"
}
```

### Backend Configuration (appsettings.json)

```json
{
    "RemoteVibe": {
        "ExtensionUrl": "http://localhost:5000",
        "ExtensionHealthCheckInterval": 5000,
        "SessionTimeout": 3600000,
        "MaxConcurrentSessions": 1
    },
    "Notifications": {
        "Firebase": {
            "ServerKey": "...",
            "SenderId": "..."
        },
        "Apple": {
            "TeamId": "...",
            "KeyId": "...",
            "BundleId": "..."
        }
    }
}
```

### Mobile Configuration

```json
{
    "BackendUrl": "https://your-machine.ngrok.io",
    "SignalRHubPath": "/hubs/remotevibe",
    "EnableNotifications": true,
    "AutoReconnect": true,
    "ReconnectDelayMs": 5000
}
```

---

## File Structure for Shared Contracts

For .NET projects, create a shared project:

```
RemoteVibe.Shared/
├── DTOs/
│   ├── Session.cs
│   ├── ConversationMessage.cs
│   ├── PendingQuestion.cs
│   ├── CommandRequest.cs
│   └── NotificationRequest.cs
├── Enums/
│   ├── SessionStatus.cs
│   ├── MessageRole.cs
│   ├── QuestionType.cs
│   └── NotificationType.cs
└── RemoteVibe.Shared.csproj
```

For TypeScript extension, define interfaces in:

```
src/types/
├── session.ts
├── messages.ts
├── questions.ts
└── commands.ts
```

---

## Validation Rules

### Session ID
- Must be valid UUID v4
- Non-empty

### Repository Path
- Must be absolute path
- Must exist on filesystem (extension validates)
- Must be a directory

### Command Text
- Min length: 1 character
- Max length: 10,000 characters
- Non-empty after trim

### Device Token
- Non-empty string
- Platform-specific format validation

### Question Answer
- For YesNo: "yes" or "no" (case-insensitive)
- For MultipleChoice: Must be one of the provided options
- For FreeText: Min 1 char, max 1,000 chars

---

## Error Codes

```typescript
enum ErrorCode {
    // Extension errors (1xxx)
    EXTENSION_NOT_CONNECTED = "1001",
    EXTENSION_TIMEOUT = "1002",
    LANGUAGE_MODEL_ERROR = "1003",
    
    // Session errors (2xxx)
    SESSION_NOT_FOUND = "2001",
    SESSION_ALREADY_EXISTS = "2002",
    SESSION_TIMEOUT = "2003",
    INVALID_SESSION_STATE = "2004",
    
    // Command errors (3xxx)
    INVALID_COMMAND = "3001",
    COMMAND_TIMEOUT = "3002",
    COMMAND_REJECTED = "3003",
    
    // Question errors (4xxx)
    QUESTION_NOT_FOUND = "4001",
    INVALID_ANSWER = "4002",
    
    // Notification errors (5xxx)
    NOTIFICATION_FAILED = "5001",
    INVALID_DEVICE_TOKEN = "5002",
    
    // General errors (9xxx)
    UNAUTHORIZED = "9001",
    INTERNAL_ERROR = "9999"
}
```

---

## Versioning

All APIs use version 1.0 for MVP. Version is communicated via:
- HTTP Header: `X-API-Version: 1.0`
- Extension package.json: `"version": "1.0.0"`
- Backend assembly: `[assembly: AssemblyVersion("1.0.0")]`

Future breaking changes will increment major version.

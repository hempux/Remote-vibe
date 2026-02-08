# Remote Vibe Design Documentation

## Quick Start for Agents

Each project can be built **independently** by separate agents. All contracts and specifications are documented here.

### 📋 Required Reading for All Agents

1. **SHARED_CONTRACTS.md** - All DTOs, API endpoints, data contracts (MUST READ)

### 🔧 For Extension Agent (TypeScript)

**Read:**
- EXTENSION_SPEC.md - Complete extension specification
- TYPESCRIPT_STANDARDS.md - TypeScript coding standards
- SHARED_CONTRACTS.md - API contracts

**Build:** VS Code extension that exposes HTTP API for Language Model

### 🖥️ For Backend Agent (C#)

**Read:**
- BACKEND_SPEC.md - Complete backend specification
- CSHARP_STANDARDS.md - C# coding standards
- SHARED_CONTRACTS.md - API contracts

**Build:** ASP.NET Core service with SignalR hub and REST API

### 📱 For Mobile Agent (C#)

**Read:**
- MOBILE_SPEC.md - Complete mobile app specification
- WEB_STANDARDS.md - Blazor/MudBlazor standards
- CSHARP_STANDARDS.md - C# coding standards
- SHARED_CONTRACTS.md - API contracts

**Build:** .NET MAUI Blazor Hybrid app with MudBlazor UI

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│ Mobile App (.NET MAUI + Blazor + MudBlazor)        │
│ - Send commands                                     │
│ - View conversation                                 │
│ - Answer questions                                  │
│ - Receive push notifications                       │
└─────────────────────────────────────────────────────┘
            ↓ HTTPS + SignalR (WebSocket)
┌─────────────────────────────────────────────────────┐
│ Backend Service (ASP.NET Core)                     │
│ - REST API for mobile                              │
│ - SignalR hub (real-time)                          │
│ - Push notifications (FCM/APNS)                    │
│ - Session coordination                             │
└─────────────────────────────────────────────────────┘
            ↓ HTTP
┌─────────────────────────────────────────────────────┐
│ VS Code Extension (TypeScript)                     │
│ - HTTP server (port 5000)                          │
│ - Language Model API integration                   │
│ - Question detection                               │
│ - Session management                               │
└─────────────────────────────────────────────────────┘
            ↓ VS Code Language Model API
┌─────────────────────────────────────────────────────┐
│ GitHub Copilot / Language Model Service            │
└─────────────────────────────────────────────────────┘
```

---

## Document Index

### Core Specifications
- **SHARED_CONTRACTS.md** (16KB) - All DTOs, API endpoints, contracts
- **EXTENSION_SPEC.md** (4KB) - VS Code extension spec (TypeScript)
- **BACKEND_SPEC.md** (20KB) - Backend service spec (C#)
- **MOBILE_SPEC.md** (20KB) - Mobile app spec (C#)

### Coding Standards
- **TYPESCRIPT_STANDARDS.md** (12KB) - TypeScript best practices
- **CSHARP_STANDARDS.md** (27KB) - C# best practices
- **WEB_STANDARDS.md** (31KB) - Blazor/MudBlazor best practices

### Process & Guidelines
- **GITHUB_INSTRUCTIONS.md** (24KB) - Git workflow, branching, PRs
- **ARCHITECTURE.md** (17KB) - System architecture deep dive
- **VSCODE_SERVER_RESEARCH.md** (12KB) - Feasibility research
- **LANGUAGE_STACK_ANALYSIS.md** (11KB) - Language choice rationale

---

## Development Workflow

### 1. Extension Development (Agent 1)

```bash
cd remote-vibe-extension
npm install
npm run compile
# Press F5 to debug
```

**Deliverable:** VS Code extension (.vsix) that exposes HTTP API

---

### 2. Backend Development (Agent 2)

```bash
cd src/RemoteVibe.Backend
dotnet restore
dotnet build
dotnet run
```

**Deliverable:** ASP.NET Core service ready to deploy

---

### 3. Mobile Development (Agent 3)

```bash
cd src/RemoteVibe.Mobile
dotnet workload install maui
dotnet restore
dotnet build

# Android
dotnet build -t:Run -f net10.0-android

# iOS
dotnet build -t:Run -f net10.0-ios
```

**Deliverable:** Mobile apps for iOS and Android

---

## Testing Integration

### Local Development Setup

1. **Start VS Code Extension:**
   - Open VS Code
   - Run extension (F5)
   - Extension starts HTTP server on port 5000

2. **Start Backend:**
   ```bash
   cd RemoteVibe.Backend
   dotnet run
   # Backend on https://localhost:5002
   ```

3. **Configure Mobile:**
   - Set `BackendUrl` to `https://localhost:5002` (or ngrok URL)
   - Run mobile app on device/emulator

4. **Test Flow:**
   - Start session from mobile
   - Send command
   - See response in real-time
   - Answer any questions

---

## API Contract Summary

### Extension API (Mobile → Backend → Extension)
- POST /extension/session/start
- POST /extension/command
- POST /extension/respond
- GET /extension/session/:id/status
- GET /extension/session/:id/messages
- DELETE /extension/session/:id
- GET /extension/health

### Backend API (Mobile → Backend)
- POST /api/session/start
- POST /api/session/:id/command
- POST /api/session/:id/respond
- GET /api/session/:id/status
- GET /api/session/:id/messages
- DELETE /api/session/:id
- POST /api/notifications/register
- GET /api/health

### SignalR Hub (Backend ↔ Mobile)
**Server → Client:**
- OnSessionStatusChanged
- OnMessageReceived
- OnQuestionPending
- OnTaskCompleted
- OnTaskFailed

**Client → Server:**
- JoinSession
- LeaveSession
- SendHeartbeat
- RequestSync

---

## Key Design Decisions

1. **Why VS Code Server?**
   - Clean Language Model API (no output parsing)
   - Multiple access methods (Desktop, Web, Mobile)
   - Container/WSL/VPS support
   - Future-proof Microsoft product

2. **Why Hybrid Language Stack?**
   - Extension MUST be TypeScript (VS Code requirement)
   - 80% of code in C# (backend + mobile)
   - Keep MudBlazor expertise
   - Only ~500 LOC TypeScript needed

3. **Why .NET MAUI over React Native?**
   - More mature for this use case
   - MudBlazor UI components
   - Better SignalR support
   - Your C# expertise

4. **Why SignalR over WebSocket?**
   - Auto-reconnection
   - Built-in .NET support
   - Better than Socket.io for C# apps

---

## Success Criteria

### Extension
- ✅ Exposes HTTP API on port 5000
- ✅ Calls Language Model API successfully
- ✅ Detects questions in responses
- ✅ Returns structured JSON

### Backend
- ✅ Communicates with extension via HTTP
- ✅ SignalR hub for mobile clients
- ✅ Push notifications sent
- ✅ Session coordination working

### Mobile
- ✅ Can start sessions
- ✅ Send commands and see responses
- ✅ Answer questions from AI
- ✅ Receive push notifications
- ✅ Professional MudBlazor UI

---

## Next Steps

1. **Spin up 3 separate agent sessions**
2. **Agent 1:** Build extension using EXTENSION_SPEC.md
3. **Agent 2:** Build backend using BACKEND_SPEC.md
4. **Agent 3:** Build mobile using MOBILE_SPEC.md
5. **Integration:** Connect all three and test end-to-end

Each agent has complete specs to work independently!


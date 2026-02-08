# Issue 003: API Testing Guide Does Not Match Implementation

## Severity: Medium

The API_TESTING_GUIDE.md documents endpoints, response shapes, and status values that do not correspond to the actual backend implementation. Anyone following the guide will get unexpected results.

## Mismatches

### A. Health endpoint URL

- **Guide says**: `GET /health`
- **Actual route**: `GET /api/health` (HealthController uses `[Route("api/[controller]")]`)
- **Guide says response**: `{"status":"Healthy"}`
- **Actual response**: `{"status":"healthy","timestamp":"...","version":"1.0.0"}`

### B. Session response shapes

**Guide documents** (for GET /api/session and POST /api/session/start):

```json
{"id": "...", "repositoryPath": "/workspace", "status": "Active", "createdAt": "..."}
```

**Actual** `SessionStatusResponse`:

```json
{
  "sessionId": "...",
  "status": "Idle",
  "startedAt": "...",
  "lastActivityAt": null,
  "messageCount": 0,
  "pendingQuestionCount": 0
}
```

Differences: `id` vs `sessionId`, missing `repositoryPath`, missing `createdAt` (it's `startedAt`), extra fields `lastActivityAt`/`messageCount`/`pendingQuestionCount`.

### C. Status endpoint response shape

**Guide says** status returns a messages array:

```json
{"sessionId": "...", "status": "Active", "messages": [...], "createdAt": "..."}
```

**Actual**: Returns `SessionStatusResponse` with no messages array. There is a separate undocumented endpoint `GET /api/session/{id}/history` for message history.

### D. Session status values

Guide uses `"Active"` everywhere. Actual `SessionStatus` enum: `Idle`, `Processing`, `WaitingForInput`, `Completed`, `Error`. No `Active` status exists.

### E. Empty response bodies

Guide says `POST .../command`, `POST .../respond`, and `DELETE .../{id}` return `{"success": true}`. Actual controllers return `Ok()` with no body.

### F. Stopped sessions still listed

Guide says "After stopping, session should not appear in GET /api/session". Actual `StopSessionAsync` only sets `status = Completed` but does not remove the session from the dictionary.

## Fix

Rewrite the API_TESTING_GUIDE.md to match the actual implementation. Create .http files for easy testing.

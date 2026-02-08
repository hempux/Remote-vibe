# Issue 002: CopilotCliService Missing Auth Headers and Request Body Fields

## Severity: Critical

Even with the standalone server running and reachable, multiple methods in `CopilotCliService` would fail due to missing Authorization headers and incomplete request bodies.

## Root Causes

### A. SendCommandAsync missing Authorization header

`backend/Services/CopilotCliService.cs:73` uses `PostAsJsonAsync()` which does **not** add the Bearer token:

```csharp
var response = await _httpClient.PostAsJsonAsync(
    $"{_vscodeServerUrl}/extension/command",
    requestBody,
    ct);
```

Compare with `StartSessionAsync` (line 39-43) which manually constructs the request and adds the header. The standalone server requires `Authorization: Bearer <token>` on all `/extension/*` routes and will return 401.

### B. StopSessionAsync missing Authorization header

`backend/Services/CopilotCliService.cs:117` uses `DeleteAsync()` without auth:

```csharp
var response = await _httpClient.DeleteAsync(
    $"{_vscodeServerUrl}/extension/session/{sessionId}",
    ct);
```

Same issue as SendCommandAsync — no Bearer token attached.

### C. StartSessionAsync missing sessionId in request body

`backend/Services/CopilotCliService.cs:38`:

```csharp
var requestBody = new { repositoryPath };
```

But `standalone-server.js` expects `{ sessionId, repositoryPath }` and returns 400 if `sessionId` is missing.

## Impact

- All command requests (`POST /api/session/{id}/command`) fail with 401
- All stop requests (`DELETE /api/session/{id}`) fail with 401
- All start requests fail with 400 (missing sessionId) even after fixing Issue 001

## Fix

1. Add Authorization header to `SendCommandAsync`
2. Add Authorization header to `StopSessionAsync`
3. Include `sessionId` in the `StartSessionAsync` request body

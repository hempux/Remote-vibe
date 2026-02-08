# Issue 001: Standalone Server Never Starts + Backend Targets Wrong Port

## Severity: Critical

The VS Code Server standalone API (port 5000) never starts, and even if it did, the backend would not reach it because it proxies to port 8080 instead.

## Root Causes

### A. Docker entrypoint overrides CMD

The `vscode-server/Dockerfile` sets:

```dockerfile
CMD ["/bin/bash", "/start.sh"]
```

But the base image (`codercom/code-server:latest`) has an entrypoint `/usr/bin/entrypoint.sh` that ends with:

```sh
exec dumb-init /usr/bin/code-server "$@"
```

The CMD args are passed as arguments **to code-server**, not executed as a command. The `/start.sh` script is never run, so `node /home/coder/standalone-server.js &` never executes.

**Evidence:**
- `docker logs` shows zero output from standalone-server.js
- `ps aux` inside the container shows no node process for standalone-server.js
- `curl localhost:5000/health` from inside the container returns connection refused

### B. Backend defaults to port 8080

`backend/Services/CopilotCliService.cs:28`:

```csharp
_vscodeServerUrl = configuration["VscodeServerUrl"] ?? "http://vscode-server:8080";
```

`docker-compose.yml` does **not** set a `VscodeServerUrl` environment variable, so the backend always falls back to port 8080 (code-server UI) instead of port 5000 (standalone API).

### C. Express installed globally instead of locally

The Dockerfile runs `npm install -g express` which installs express globally. Node.js `require('express')` does not resolve global packages, so even with the entrypoint fixed, standalone-server.js crashes immediately with:

```
Error: Cannot find module 'express'
```

The node process shows as `[node] <defunct>` (zombie) in `ps aux`.

### D. Auth token env var name mismatch

`standalone-server.js` reads `process.env.VSCODE_SERVER_AUTH_TOKEN`, but `docker-compose.yml` sets `REMOTE_VIBE_AUTH_TOKEN`. It only works by coincidence because the hardcoded fallback values match.

## Impact

- `POST /api/session/start` always returns 500
- `POST /api/session/{id}/command` always returns 500
- No API flow works end-to-end

## Fix

1. Override the Dockerfile entrypoint to use `/start.sh` directly
2. Replace `npm install -g express` with local install in `/home/coder`
3. Add `VscodeServerUrl=http://vscode-server:5000` to docker-compose.yml backend environment
4. Align the auth token env var name in standalone-server.js with docker-compose.yml

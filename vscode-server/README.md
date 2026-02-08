# VS Code Server Setup

This directory contains the Docker configuration for running VS Code Server with the Remote Vibe extension pre-installed.

## What's Inside

- **Dockerfile** - Builds code-server with Remote Vibe extension
- **settings.json** - Pre-configured extension settings

## Quick Start

```bash
# Start everything (backend + VS Code Server + mobile app)
./start-dev.sh

# Or just backend and VS Code Server (skip mobile)
./start-dev.sh --no-mobile

# Or manually
docker-compose up -d
```

## Access VS Code Server

1. Open browser: http://localhost:8080
2. Password: `remotevibe`
3. The Remote Vibe extension will auto-start

## Configuration

The extension is pre-configured to connect to:
- Backend URL: http://backend:5002
- Auto-start: enabled

You can modify settings in VS Code Server:
- File → Preferences → Settings
- Search for "Remote Vibe"

## Workspace

Your code projects are stored in `../workspace/` which is mounted into the container.

## Architecture

```
┌─────────────────────┐
│  Mobile App         │
│  (Android)          │
└──────────┬──────────┘
           │ HTTP/SignalR
           │ 10.0.2.2:5002
           │
┌──────────▼──────────┐      ┌─────────────────────┐
│  Backend            │◄─────┤  VS Code Server     │
│  Port: 5002         │      │  Port: 8080         │
└─────────────────────┘      │  + Remote Vibe Ext  │
                             └─────────────────────┘
```

## Extension Features

The Remote Vibe extension exposes:
- Language Model API (GitHub Copilot)
- Session management
- Real-time streaming responses
- File change notifications

## Logs

```bash
# View VS Code Server logs
docker logs -f remote-vibe-vscode-server-1

# View backend logs
docker logs -f remote-vibe-backend-1

# View all logs
docker-compose logs -f
```

## Troubleshooting

**VS Code Server not starting:**
```bash
docker-compose down
docker-compose up -d --build
```

**Extension not loading:**
1. Check logs: `docker logs remote-vibe-vscode-server-1`
2. Rebuild: `docker-compose build vscode-server`
3. Check extension folder in container:
   ```bash
   docker exec -it remote-vibe-vscode-server-1 \
     ls -la /home/coder/.local/share/code-server/extensions/
   ```

**Can't connect from mobile:**
- Backend must be running
- Check network: `docker network inspect remote-vibe_remotevibe-network`
- Verify backend URL in mobile app settings

## Development

To modify the extension:
1. Edit code in `../remote-vibe-extension/`
2. Rebuild: `docker-compose build vscode-server`
3. Restart: `docker-compose restart vscode-server`

## Production Notes

For production deployment:
- Change the password in docker-compose.yml
- Use HTTPS (add reverse proxy like nginx)
- Enable authentication
- Use environment-specific backend URLs

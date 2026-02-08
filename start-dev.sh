#!/bin/bash
set -e

echo "🚀 Starting Remote Vibe Development Environment"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Export required environment variables
export ANDROID_HOME="$HOME/Library/Android/sdk"
export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"

# 1. Start backend and VS Code Server
echo "📦 Starting backend and VS Code Server in Docker..."
if docker ps | grep -q "remote-vibe-backend-1"; then
    echo "   ✅ Backend already running"
else
    docker-compose up -d --build
    echo "   ⏳ Waiting for services to start..."
    sleep 8
fi

# Check backend health
if curl -s http://localhost:5002/api/health > /dev/null 2>&1; then
    echo "   ✅ Backend is healthy at http://localhost:5002"
else
    echo "   ⚠️  Backend not responding, but continuing..."
fi

# Check VS Code Server
if curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo "   ✅ VS Code Server is running at http://localhost:8080"
    echo "      Password: remotevibe"
else
    echo "   ⚠️  VS Code Server not responding yet..."
fi
echo ""

# 2. Start Android emulator (optional)
if [ "$1" != "--no-mobile" ]; then
    echo "📱 Checking Android emulator..."
    if $ANDROID_HOME/platform-tools/adb devices | grep -q "emulator-"; then
        echo "   ✅ Emulator already running"
    else
        echo "   🔄 Starting emulator (this may take 30-60 seconds)..."
        $ANDROID_HOME/emulator/emulator -avd Medium_Phone_API_36.1 > /dev/null 2>&1 &
        EMULATOR_PID=$!
        echo "   Started emulator (PID: $EMULATOR_PID)"
        
        echo "   ⏳ Waiting for emulator to boot..."
        $ANDROID_HOME/platform-tools/adb wait-for-device
        sleep 5  # Extra time for full boot
        echo "   ✅ Emulator ready"
    fi
    echo ""

    # 3. Deploy mobile app
    echo "🚀 Building and deploying mobile app..."
    cd "$SCRIPT_DIR/src/RemoteVibe.Mobile"
    dotnet build -f net10.0-android -t:Run
    cd "$SCRIPT_DIR"
fi

echo ""
echo "✅ Development environment is ready!"
echo ""
echo "🌐 Services:"
echo "   Backend:        http://localhost:5002"
echo "   VS Code Server: http://localhost:8080 (password: remotevibe)"
echo "   Mobile App:     Running on emulator"
echo ""
echo "📝 Next steps:"
echo "   1. Open VS Code Server in browser: http://localhost:8080"
echo "   2. The Remote Vibe extension should auto-start"
echo "   3. Use mobile app to control sessions"
echo ""
echo "🔍 Logs:"
echo "   Backend:     docker logs -f remote-vibe-backend-1"
echo "   VS Code:     docker logs -f remote-vibe-vscode-server-1"
echo ""
echo "🛑 Stop all:"
echo "   Backend/VS Code: docker-compose down"
echo "   Emulator:        adb emu kill"
echo ""
echo "💡 Tip: Run with --no-mobile to skip mobile app deployment"

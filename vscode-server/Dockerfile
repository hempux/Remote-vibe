FROM codercom/code-server:latest

# Install Node.js and build tools
USER root

# Install Node.js 20.x
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get update && apt-get install -y \
    nodejs \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Verify installations
RUN node --version && npm --version

# Set working directory
WORKDIR /home/coder/workspace

# Copy the extension source from project root
COPY remote-vibe-extension /tmp/remote-vibe-extension

# Install dependencies and compile the extension
RUN cd /tmp/remote-vibe-extension && npm install && npm run compile

# Install extension for coder user
USER coder
RUN mkdir -p /home/coder/.local/share/code-server/extensions/remote-vibe-extension && \
    cp -r /tmp/remote-vibe-extension/* /home/coder/.local/share/code-server/extensions/remote-vibe-extension/

# Copy VS Code settings
USER root
RUN mkdir -p /home/coder/.local/share/code-server/User
COPY vscode-server/settings.json /home/coder/.local/share/code-server/User/settings.json
RUN chown -R coder:coder /home/coder/.local

# Copy standalone server and install its dependencies locally
COPY vscode-server/standalone-server.js /home/coder/standalone-server.js
RUN cd /home/coder && npm init -y && npm install express
RUN chown -R coder:coder /home/coder/standalone-server.js /home/coder/node_modules /home/coder/package.json /home/coder/package-lock.json
RUN chmod +x /home/coder/standalone-server.js

# Switch back to coder user
USER coder

# Expose code-server port and API port
EXPOSE 8080 5000

# Set environment variables
ENV PASSWORD=remotevibe
ENV REMOTE_VIBE_BACKEND_URL=http://backend:5002
ENV REMOTE_VIBE_AUTO_START=true

# Create startup script to run both servers
USER root
RUN printf '#!/bin/bash\nnode /home/coder/standalone-server.js &\nexec code-server --bind-addr 0.0.0.0:8080 --auth password /home/coder/workspace\n' > /start.sh && \
    chmod +x /start.sh && \
    chown coder:coder /start.sh

USER coder

# Override base image entrypoint so /start.sh actually runs
ENTRYPOINT []

# Start both code-server and standalone API server
CMD ["/bin/bash", "/start.sh"]

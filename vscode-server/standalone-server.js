#!/usr/bin/env node

// Standalone HTTP server that mimics the VS Code extension API
// This runs independently of code-server to provide the Remote Vibe API

const express = require('express');
const Database = require('better-sqlite3');
const { randomUUID } = require('crypto');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;
const AUTH_TOKEN = process.env.REMOTE_VIBE_AUTH_TOKEN || 'remote-vibe-internal-token';
const DB_PATH = process.env.REMOTE_VIBE_DB_PATH || '/home/coder/data/vscode-server.db';

// Ensure the data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize SQLite database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        repositoryPath TEXT NOT NULL DEFAULT '/home/coder/workspace',
        status TEXT NOT NULL DEFAULT 'Active',
        phase TEXT NOT NULL DEFAULT 'new',
        planningStep INTEGER NOT NULL DEFAULT 0,
        answers TEXT NOT NULL DEFAULT '{}',
        description TEXT,
        createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS session_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sessionId TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (sessionId) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session ON session_messages(sessionId);
`);

console.log(`[${new Date().toISOString()}] SQLite database initialized at ${DB_PATH}`);

app.use(express.json());

// Prepared statements for performance
const stmts = {
    insertSession: db.prepare(`
        INSERT INTO sessions (id, repositoryPath, status, phase, planningStep, answers, description, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `),
    getSession: db.prepare('SELECT * FROM sessions WHERE id = ?'),
    updateSession: db.prepare(`
        UPDATE sessions SET status = ?, phase = ?, planningStep = ?, answers = ?, description = ?
        WHERE id = ?
    `),
    deleteSession: db.prepare('DELETE FROM sessions WHERE id = ?'),
    insertMessage: db.prepare(`
        INSERT INTO session_messages (sessionId, role, content, timestamp) VALUES (?, ?, ?, ?)
    `),
    getMessages: db.prepare('SELECT role, content, timestamp FROM session_messages WHERE sessionId = ? ORDER BY id ASC'),
};

// Helper: load session from DB into JS object
function loadSession(sessionId) {
    const row = stmts.getSession.get(sessionId);
    if (!row) return null;

    const messages = stmts.getMessages.all(sessionId);
    return {
        id: row.id,
        repositoryPath: row.repositoryPath,
        status: row.status,
        phase: row.phase,
        planningStep: row.planningStep,
        answers: JSON.parse(row.answers),
        description: row.description,
        createdAt: row.createdAt,
        messages
    };
}

// Helper: save session state back to DB
function saveSession(session) {
    stmts.updateSession.run(
        session.status,
        session.phase,
        session.planningStep,
        JSON.stringify(session.answers),
        session.description,
        session.id
    );
}

// Helper: add message to DB
function addMessage(sessionId, role, content) {
    const timestamp = new Date().toISOString();
    stmts.insertMessage.run(sessionId, role, content, timestamp);
    return { role, content, timestamp };
}

// Planning questions script
const PLANNING_QUESTIONS = [
    {
        question: 'What framework or technology stack would you prefer?',
        type: 'MultipleChoice',
        options: ['React + TypeScript', 'Vue.js', 'Angular', 'Blazor / .NET', 'Other']
    },
    {
        question: 'Do you need user authentication?',
        type: 'YesNo',
        options: null
    },
    {
        question: "What's the most important non-functional requirement?",
        type: 'MultipleChoice',
        options: ['Performance', 'Security', 'Simplicity', 'Scalability']
    }
];

// Auth middleware
const auth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    if (token !== AUTH_TOKEN) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
};

// Health check (no auth required)
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start a new session
app.post('/extension/session/start', auth, async (req, res) => {
    try {
        const { sessionId, repositoryPath } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'sessionId is required' });
        }

        console.log(`[${new Date().toISOString()}] Starting session ${sessionId}`);

        const repoPath = repositoryPath || '/home/coder/workspace';
        const createdAt = new Date().toISOString();

        stmts.insertSession.run(sessionId, repoPath, 'Active', 'new', 0, '{}', null, createdAt);

        res.json({ success: true, sessionId });
    } catch (error) {
        console.error('Error starting session:', error);
        res.status(500).json({ error: error.message });
    }
});

// Send command to session
app.post('/extension/command', auth, async (req, res) => {
    try {
        const { sessionId, command } = req.body;

        if (!sessionId || !command) {
            return res.status(400).json({ error: 'sessionId and command are required' });
        }

        const session = loadSession(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        console.log(`[${new Date().toISOString()}] Command for session ${sessionId} (phase: ${session.phase}): ${command}`);

        addMessage(sessionId, 'user', command);

        const responseMessages = [];
        const responseQuestions = [];
        let statusChange = null;

        if (session.phase === 'new') {
            // First command = project description → start planning
            session.description = command;
            session.phase = 'planning';
            session.planningStep = 0;

            const assistantContent = `Great! I'll help you build that. Let me understand your requirements better before we start.\n\nProject: "${command}"\n\nI have a few questions to help me plan the implementation.`;
            addMessage(sessionId, 'assistant', assistantContent);
            responseMessages.push({ role: 'assistant', content: assistantContent });

            const q = PLANNING_QUESTIONS[0];
            responseQuestions.push({
                id: randomUUID(),
                question: q.question,
                type: q.type,
                options: q.options
            });

            statusChange = 'WaitingForInput';
        } else if (session.phase === 'implementing') {
            const assistantContent = `Working on: "${command}"\n\nI'm implementing the changes now. This is a simulated response — in production this would interface with the actual coding agent.`;
            addMessage(sessionId, 'assistant', assistantContent);
            responseMessages.push({ role: 'assistant', content: assistantContent });
            statusChange = 'Processing';
        } else {
            const assistantContent = `Received your message. Current phase: ${session.phase}.`;
            addMessage(sessionId, 'assistant', assistantContent);
            responseMessages.push({ role: 'assistant', content: assistantContent });
        }

        saveSession(session);

        res.json({
            success: true,
            messages: responseMessages,
            questions: responseQuestions,
            statusChange
        });
    } catch (error) {
        console.error('Error sending command:', error);
        res.status(500).json({ error: error.message });
    }
});

// Respond to question
app.post('/extension/respond', auth, async (req, res) => {
    try {
        const { sessionId, questionId, response } = req.body;

        if (!sessionId || !response) {
            return res.status(400).json({ error: 'sessionId and response are required' });
        }

        const session = loadSession(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        console.log(`[${new Date().toISOString()}] Response for session ${sessionId} (phase: ${session.phase}, step: ${session.planningStep}): ${response}`);

        const responseMessages = [];
        const responseQuestions = [];
        let statusChange = null;

        if (session.phase === 'planning') {
            const currentQuestion = PLANNING_QUESTIONS[session.planningStep];
            session.answers[currentQuestion.question] = response;
            session.planningStep++;

            const ackContent = `Got it: "${response}". Thanks!`;
            addMessage(sessionId, 'assistant', ackContent);
            responseMessages.push({ role: 'assistant', content: ackContent });

            if (session.planningStep < PLANNING_QUESTIONS.length) {
                const nextQ = PLANNING_QUESTIONS[session.planningStep];
                responseQuestions.push({
                    id: randomUUID(),
                    question: nextQ.question,
                    type: nextQ.type,
                    options: nextQ.options
                });
                statusChange = 'WaitingForInput';
            } else {
                // All planning questions answered — present plan summary
                session.phase = 'plan-ready';

                const answerSummary = Object.entries(session.answers)
                    .map(([q, a]) => `  - ${q} → ${a}`)
                    .join('\n');

                const planContent = `Here's the implementation plan based on your requirements:\n\n**Project:** ${session.description}\n\n**Your preferences:**\n${answerSummary}\n\n**Proposed approach:**\n1. Set up the project structure and dependencies\n2. Implement core data models\n3. Build the API layer\n4. Create the UI components\n5. Add tests and documentation\n\nWould you like to proceed with implementation?`;
                addMessage(sessionId, 'assistant', planContent);
                responseMessages.push({ role: 'assistant', content: planContent });

                responseQuestions.push({
                    id: randomUUID(),
                    question: 'Ready to start implementation?',
                    type: 'YesNo',
                    options: null
                });
                statusChange = 'WaitingForInput';
            }
        } else if (session.phase === 'plan-ready') {
            if (response.toLowerCase() === 'yes') {
                session.phase = 'implementing';
                const startContent = `Starting implementation now! I'll begin setting up the project structure based on your plan.\n\nYou can send commands to guide the implementation or ask questions as I work.`;
                addMessage(sessionId, 'assistant', startContent);
                responseMessages.push({ role: 'assistant', content: startContent });
                statusChange = 'Processing';
            } else {
                session.phase = 'planning';
                session.planningStep = 0;
                session.answers = {};
                const restartContent = `No problem! Let's revisit the plan. Tell me what you'd like to change, or I'll ask the planning questions again.`;
                addMessage(sessionId, 'assistant', restartContent);
                responseMessages.push({ role: 'assistant', content: restartContent });

                const q = PLANNING_QUESTIONS[0];
                responseQuestions.push({
                    id: randomUUID(),
                    question: q.question,
                    type: q.type,
                    options: q.options
                });
                statusChange = 'WaitingForInput';
            }
        } else {
            const otherContent = `Response received. Current phase: ${session.phase}.`;
            addMessage(sessionId, 'assistant', otherContent);
            responseMessages.push({ role: 'assistant', content: otherContent });
        }

        saveSession(session);

        res.json({
            success: true,
            messages: responseMessages,
            questions: responseQuestions,
            statusChange
        });
    } catch (error) {
        console.error('Error responding to question:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get session status
app.get('/extension/session/:sessionId/status', auth, (req, res) => {
    const { sessionId } = req.params;

    const session = loadSession(sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
        sessionId: session.id,
        status: session.status,
        phase: session.phase,
        planningStep: session.planningStep,
        messages: session.messages,
        createdAt: session.createdAt
    });
});

// Stop session
app.delete('/extension/session/:sessionId', auth, (req, res) => {
    const { sessionId } = req.params;

    const session = loadSession(sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    console.log(`[${new Date().toISOString()}] Stopping session ${sessionId}`);

    stmts.deleteSession.run(sessionId);

    res.json({ success: true });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log(`[${new Date().toISOString()}] Shutting down, closing database...`);
    db.close();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log(`[${new Date().toISOString()}] Received SIGINT, closing database...`);
    db.close();
    process.exit(0);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[${new Date().toISOString()}] Remote Vibe standalone server listening on port ${PORT}`);
    console.log(`[${new Date().toISOString()}] SQLite database: ${DB_PATH}`);
    console.log(`[${new Date().toISOString()}] Auth token: ${AUTH_TOKEN.substring(0, 10)}...`);
});

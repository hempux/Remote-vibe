#!/usr/bin/env node

// Standalone HTTP server that mimics the VS Code extension API
// This runs independently of code-server to provide the Remote Vibe API

const express = require('express');
const { randomUUID } = require('crypto');

const app = express();
const PORT = 5000;
const AUTH_TOKEN = process.env.REMOTE_VIBE_AUTH_TOKEN || 'remote-vibe-internal-token';

app.use(express.json());

// In-memory session storage
const sessions = new Map();

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

        const session = {
            id: sessionId,
            repositoryPath: repositoryPath || '/home/coder/workspace',
            status: 'Active',
            phase: 'new',
            planningStep: 0,
            answers: {},
            description: null,
            createdAt: new Date().toISOString(),
            messages: []
        };

        sessions.set(sessionId, session);

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

        const session = sessions.get(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        console.log(`[${new Date().toISOString()}] Command for session ${sessionId} (phase: ${session.phase}): ${command}`);

        session.messages.push({
            role: 'user',
            content: command,
            timestamp: new Date().toISOString()
        });

        const responseMessages = [];
        const responseQuestions = [];
        let statusChange = null;

        if (session.phase === 'new') {
            // First command = project description → start planning
            session.description = command;
            session.phase = 'planning';
            session.planningStep = 0;

            responseMessages.push({
                role: 'assistant',
                content: `Great! I'll help you build that. Let me understand your requirements better before we start.\n\nProject: "${command}"\n\nI have a few questions to help me plan the implementation.`
            });

            const q = PLANNING_QUESTIONS[0];
            responseQuestions.push({
                id: randomUUID(),
                question: q.question,
                type: q.type,
                options: q.options
            });

            statusChange = 'WaitingForInput';
        } else if (session.phase === 'implementing') {
            responseMessages.push({
                role: 'assistant',
                content: `Working on: "${command}"\n\nI'm implementing the changes now. This is a simulated response — in production this would interface with the actual coding agent.`
            });
            statusChange = 'Processing';
        } else {
            responseMessages.push({
                role: 'assistant',
                content: `Received your message. Current phase: ${session.phase}.`
            });
        }

        for (const msg of responseMessages) {
            session.messages.push({ ...msg, timestamp: new Date().toISOString() });
        }

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

        const session = sessions.get(sessionId);
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

            responseMessages.push({
                role: 'assistant',
                content: `Got it: "${response}". Thanks!`
            });

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

                responseMessages.push({
                    role: 'assistant',
                    content: `Here's the implementation plan based on your requirements:\n\n**Project:** ${session.description}\n\n**Your preferences:**\n${answerSummary}\n\n**Proposed approach:**\n1. Set up the project structure and dependencies\n2. Implement core data models\n3. Build the API layer\n4. Create the UI components\n5. Add tests and documentation\n\nWould you like to proceed with implementation?`
                });

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
                responseMessages.push({
                    role: 'assistant',
                    content: `Starting implementation now! I'll begin setting up the project structure based on your plan.\n\nYou can send commands to guide the implementation or ask questions as I work.`
                });
                statusChange = 'Processing';
            } else {
                session.phase = 'planning';
                session.planningStep = 0;
                session.answers = {};
                responseMessages.push({
                    role: 'assistant',
                    content: `No problem! Let's revisit the plan. Tell me what you'd like to change, or I'll ask the planning questions again.`
                });

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
            responseMessages.push({
                role: 'assistant',
                content: `Response received. Current phase: ${session.phase}.`
            });
        }

        for (const msg of responseMessages) {
            session.messages.push({ ...msg, timestamp: new Date().toISOString() });
        }

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

    const session = sessions.get(sessionId);
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

    const session = sessions.get(sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    console.log(`[${new Date().toISOString()}] Stopping session ${sessionId}`);

    session.status = 'Stopped';
    sessions.delete(sessionId);

    res.json({ success: true });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[${new Date().toISOString()}] Remote Vibe standalone server listening on port ${PORT}`);
    console.log(`[${new Date().toISOString()}] Auth token: ${AUTH_TOKEN.substring(0, 10)}...`);
});

import {
  Session,
  ConversationMessage,
  PendingQuestion,
  GitHubRepository,
  GitHubAuthStatus,
  CopilotAuthStatus,
  UsageQuota,
} from '../data/types';

let baseUrl = 'https://localhost:5002';

export function setBaseUrl(url: string) {
  baseUrl = url.replace(/\/+$/, '');
}

export function getBaseUrl(): string {
  return baseUrl;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`API ${response.status}: ${text || response.statusText}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json();
  }
  return undefined as T;
}

// Session APIs
export async function getAllSessions(): Promise<Session[]> {
  return request<Session[]>('/api/session');
}

export async function startSession(
  repositoryOwner: string,
  repositoryName: string,
  taskDescription?: string
): Promise<Session> {
  return request<Session>('/api/session/start', {
    method: 'POST',
    body: JSON.stringify({ repositoryOwner, repositoryName, taskDescription }),
  });
}

export async function getSessionStatus(sessionId: string): Promise<Session> {
  return request<Session>(`/api/session/${sessionId}/status`);
}

export async function sendCommand(sessionId: string, command: string): Promise<void> {
  return request<void>(`/api/session/${sessionId}/command`, {
    method: 'POST',
    body: JSON.stringify({ command }),
  });
}

export async function respondToQuestion(
  sessionId: string,
  questionId: string,
  response: string
): Promise<void> {
  return request<void>(`/api/session/${sessionId}/respond`, {
    method: 'POST',
    body: JSON.stringify({ questionId, response }),
  });
}

export async function getMessages(
  sessionId: string,
  skip: number = 0,
  take: number = 50
): Promise<ConversationMessage[]> {
  return request<ConversationMessage[]>(
    `/api/session/${sessionId}/history?skip=${skip}&take=${take}`
  );
}

export async function getPendingQuestions(
  sessionId: string
): Promise<PendingQuestion[]> {
  return request<PendingQuestion[]>(`/api/session/${sessionId}/questions`);
}

export async function stopSession(sessionId: string): Promise<void> {
  return request<void>(`/api/session/${sessionId}`, {
    method: 'DELETE',
  });
}

// GitHub APIs
export async function setGitHubToken(token: string): Promise<GitHubAuthStatus> {
  return request<GitHubAuthStatus>('/api/github/auth', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function getGitHubAuthStatus(): Promise<GitHubAuthStatus> {
  return request<GitHubAuthStatus>('/api/github/auth/status');
}

export async function getRepositories(): Promise<GitHubRepository[]> {
  return request<GitHubRepository[]>('/api/github/repositories');
}

// Copilot APIs
export async function setCopilotAuth(gitHubToken: string): Promise<CopilotAuthStatus> {
  return request<CopilotAuthStatus>('/api/copilot/auth', {
    method: 'POST',
    body: JSON.stringify({ gitHubToken }),
  });
}

export async function getCopilotAuthStatus(): Promise<CopilotAuthStatus> {
  return request<CopilotAuthStatus>('/api/copilot/auth/status');
}

export async function getUsageQuota(): Promise<UsageQuota> {
  return request<UsageQuota>('/api/copilot/quota');
}

// Notification APIs
export async function registerDevice(deviceToken: string, platform: string): Promise<void> {
  return request<void>('/api/notifications/register', {
    method: 'POST',
    body: JSON.stringify({ deviceToken, platform }),
  });
}

export async function unregisterDevice(deviceToken: string): Promise<void> {
  return request<void>(`/api/notifications/unregister/${deviceToken}`, {
    method: 'DELETE',
  });
}

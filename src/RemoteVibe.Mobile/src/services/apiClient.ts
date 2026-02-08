import {
  Session,
  ConversationMessage,
  PendingQuestion,
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

export async function getAllSessions(): Promise<Session[]> {
  return request<Session[]>('/api/session');
}

export async function startSession(repositoryPath: string): Promise<Session> {
  return request<Session>('/api/session/start', {
    method: 'POST',
    body: JSON.stringify({ repositoryPath }),
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

export type SessionStatus = 'Processing' | 'WaitingForInput' | 'Completed' | 'Idle' | 'Error';

export interface Session {
  sessionId: string;
  repositoryOwner?: string;
  repositoryName?: string;
  repositoryPath?: string;
  taskDescription?: string;
  status: SessionStatus;
  startedAt: string;
  lastActivityAt: string | null;
  currentCommand: string | null;
  messageCount?: number;
  pendingQuestionCount?: number;
}

export interface GitHubRepository {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  isPrivate: boolean;
  updatedAt: string;
  defaultBranch: string;
}

export interface GitHubAuthStatus {
  isAuthenticated: boolean;
  username: string | null;
  avatarUrl: string | null;
}

export interface GitHubDeviceCode {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}

export interface CopilotAuthStatus {
  isAuthenticated: boolean;
  username: string | null;
  requiresAdditionalAuth: boolean;
  authUrl: string | null;
}

export interface UsageQuota {
  premiumRequestsUsed: number;
  premiumRequestsLimit: number;
  percentageUsed: number;
  resetDate: string;
}

export type MessageRole = 'User' | 'Assistant' | 'System';

export interface MessageMetadata {
  filesChanged?: string[];
  commandId?: string;
  quotedQuestion?: string;
}

export interface ConversationMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  metadata?: MessageMetadata;
}

export type QuestionType = 'MultipleChoice' | 'YesNo' | 'FreeText';

export interface PendingQuestion {
  id: string;
  sessionId: string;
  question: string;
  questionType: QuestionType;
  options: string[] | null;
  timestamp: string;
}

export interface TaskCompletedEvent {
  sessionId: string;
  commandId: string;
  summary: string;
  filesChanged: string[];
  completedAt: string;
}

export function getStatusColor(status: SessionStatus): string {
  switch (status) {
    case 'Processing':
      return '#00d4ff';
    case 'WaitingForInput':
      return '#eab308';
    case 'Completed':
      return '#22c55e';
    case 'Idle':
      return 'rgba(255, 255, 255, 0.4)';
    case 'Error':
      return '#ef4444';
  }
}

export function getStatusLabel(status: SessionStatus): string {
  switch (status) {
    case 'Processing':
      return 'Processing';
    case 'WaitingForInput':
      return 'Waiting for Input';
    case 'Completed':
      return 'Completed';
    case 'Idle':
      return 'Idle';
    case 'Error':
      return 'Error';
  }
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

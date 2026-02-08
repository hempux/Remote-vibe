import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import {
  Session,
  ConversationMessage,
  PendingQuestion,
  TaskCompletedEvent,
} from '../data/types';

type Callback<T> = (data: T) => void;
type VoidCallback = () => void;

class SignalRService {
  private connection: HubConnection | null = null;
  private sessionStatusCallbacks: Callback<Session>[] = [];
  private messageCallbacks: Callback<ConversationMessage>[] = [];
  private questionCallbacks: Callback<PendingQuestion>[] = [];
  private taskCompletedCallbacks: Callback<TaskCompletedEvent>[] = [];
  private reconnectingCallbacks: VoidCallback[] = [];
  private reconnectedCallbacks: VoidCallback[] = [];
  private closeCallbacks: VoidCallback[] = [];

  get isConnected(): boolean {
    return this.connection?.state === HubConnectionState.Connected;
  }

  async connect(baseUrl: string): Promise<void> {
    if (this.connection) {
      await this.disconnect();
    }

    const hubUrl = `${baseUrl.replace(/\/+$/, '')}/hubs/remotevibe`;

    this.connection = new HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(LogLevel.Warning)
      .build();

    this.connection.on('OnSessionStatusChanged', (data: Session) => {
      this.sessionStatusCallbacks.forEach((cb) => cb(data));
    });

    this.connection.on('OnMessageReceived', (data: ConversationMessage) => {
      this.messageCallbacks.forEach((cb) => cb(data));
    });

    this.connection.on('OnQuestionPending', (data: PendingQuestion) => {
      this.questionCallbacks.forEach((cb) => cb(data));
    });

    this.connection.on('OnTaskCompleted', (data: TaskCompletedEvent) => {
      this.taskCompletedCallbacks.forEach((cb) => cb(data));
    });

    this.connection.onreconnecting(() => {
      this.reconnectingCallbacks.forEach((cb) => cb());
    });

    this.connection.onreconnected(() => {
      this.reconnectedCallbacks.forEach((cb) => cb());
    });

    this.connection.onclose(() => {
      this.closeCallbacks.forEach((cb) => cb());
    });

    await this.connection.start();
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
  }

  async joinSession(sessionId: string): Promise<void> {
    if (this.connection?.state === HubConnectionState.Connected) {
      await this.connection.invoke('JoinSession', sessionId);
    }
  }

  async leaveSession(sessionId: string): Promise<void> {
    if (this.connection?.state === HubConnectionState.Connected) {
      await this.connection.invoke('LeaveSession', sessionId);
    }
  }

  async sendHeartbeat(): Promise<void> {
    if (this.connection?.state === HubConnectionState.Connected) {
      await this.connection.invoke('SendHeartbeat');
    }
  }

  onSessionStatusChanged(callback: Callback<Session>): () => void {
    this.sessionStatusCallbacks.push(callback);
    return () => {
      this.sessionStatusCallbacks = this.sessionStatusCallbacks.filter(
        (cb) => cb !== callback
      );
    };
  }

  onMessageReceived(callback: Callback<ConversationMessage>): () => void {
    this.messageCallbacks.push(callback);
    return () => {
      this.messageCallbacks = this.messageCallbacks.filter(
        (cb) => cb !== callback
      );
    };
  }

  onQuestionPending(callback: Callback<PendingQuestion>): () => void {
    this.questionCallbacks.push(callback);
    return () => {
      this.questionCallbacks = this.questionCallbacks.filter(
        (cb) => cb !== callback
      );
    };
  }

  onTaskCompleted(callback: Callback<TaskCompletedEvent>): () => void {
    this.taskCompletedCallbacks.push(callback);
    return () => {
      this.taskCompletedCallbacks = this.taskCompletedCallbacks.filter(
        (cb) => cb !== callback
      );
    };
  }

  onReconnecting(callback: VoidCallback): () => void {
    this.reconnectingCallbacks.push(callback);
    return () => {
      this.reconnectingCallbacks = this.reconnectingCallbacks.filter(
        (cb) => cb !== callback
      );
    };
  }

  onReconnected(callback: VoidCallback): () => void {
    this.reconnectedCallbacks.push(callback);
    return () => {
      this.reconnectedCallbacks = this.reconnectedCallbacks.filter(
        (cb) => cb !== callback
      );
    };
  }

  onClose(callback: VoidCallback): () => void {
    this.closeCallbacks.push(callback);
    return () => {
      this.closeCallbacks = this.closeCallbacks.filter(
        (cb) => cb !== callback
      );
    };
  }
}

export const signalRService = new SignalRService();

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { signalRService } from '../services/signalRService';
import * as apiClient from '../services/apiClient';
import * as storage from '../services/storage';
import * as notificationService from '../services/notificationService';
import { Session, ConversationMessage, PendingQuestion } from '../data/types';

interface AppContextType {
  backendUrl: string;
  setBackendUrl: (url: string) => Promise<void>;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  subscribeSessionStatus: (cb: (session: Session) => void) => () => void;
  subscribeMessage: (cb: (msg: ConversationMessage) => void) => () => void;
  subscribeQuestion: (cb: (q: PendingQuestion) => void) => () => void;
  pushToken: string | null;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [backendUrl, setBackendUrlState] = useState('https://localhost:5002');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Load saved settings
    storage.getBackendUrl().then((url) => {
      setBackendUrlState(url);
      apiClient.setBaseUrl(url);
    });

    // Initialize push notifications
    notificationService.registerForPushNotifications().then((token) => {
      if (token) setPushToken(token);
    });

    // Set up notification response listener (for when user taps notification)
    const responseSubscription = notificationService.addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      // Navigation to specific session could be handled here with a global navigator ref
      // For now, the notification will bring the app to the foreground
    });

    return () => {
      responseSubscription.remove();
    };
  }, []);

  // Restore GitHub token to backend on startup
  useEffect(() => {
    storage.getGitHubToken().then(async (token) => {
      if (token) {
        try {
          await apiClient.setGitHubToken(token);
        } catch {
          // Expected during app startup: backend may not be available yet.
          // Token will be re-sent when the user navigates to settings or starts a session.
        }
      }
    });
  }, [backendUrl]);

  useEffect(() => {
    const unsubReconnecting = signalRService.onReconnecting(() => {
      setIsConnected(false);
      setIsConnecting(true);
    });
    const unsubReconnected = signalRService.onReconnected(() => {
      setIsConnected(true);
      setIsConnecting(false);
    });
    const unsubClose = signalRService.onClose(() => {
      setIsConnected(false);
      setIsConnecting(false);
    });

    return () => {
      unsubReconnecting();
      unsubReconnected();
      unsubClose();
    };
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      await signalRService.connect(backendUrl);
      setIsConnected(true);
    } catch {
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [backendUrl]);

  const disconnect = useCallback(async () => {
    await signalRService.disconnect();
    setIsConnected(false);
  }, []);

  const setBackendUrl = useCallback(async (url: string) => {
    setBackendUrlState(url);
    apiClient.setBaseUrl(url);
    await storage.setBackendUrl(url);
  }, []);

  const subscribeSessionStatus = useCallback(
    (cb: (session: Session) => void) => signalRService.onSessionStatusChanged(cb),
    []
  );

  const subscribeMessage = useCallback(
    (cb: (msg: ConversationMessage) => void) => signalRService.onMessageReceived(cb),
    []
  );

  const subscribeQuestion = useCallback(
    (cb: (q: PendingQuestion) => void) => signalRService.onQuestionPending(cb),
    []
  );

  return (
    <AppContext.Provider
      value={{
        backendUrl,
        setBackendUrl,
        isConnected,
        isConnecting,
        connect,
        disconnect,
        subscribeSessionStatus,
        subscribeMessage,
        subscribeQuestion,
        pushToken,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

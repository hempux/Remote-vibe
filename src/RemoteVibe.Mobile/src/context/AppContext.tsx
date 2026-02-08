import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { signalRService } from '../services/signalRService';
import * as apiClient from '../services/apiClient';
import * as storage from '../services/storage';
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
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    storage.getBackendUrl().then((url) => {
      setBackendUrlState(url);
      apiClient.setBaseUrl(url);
    });
  }, []);

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
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

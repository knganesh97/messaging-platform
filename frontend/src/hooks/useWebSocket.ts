import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { WebSocketMessage, WebSocketMessageType, Message } from '../types';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';

type MessageHandler = (data: WebSocketMessage) => void;

interface UseWebSocketReturn {
  isConnected: boolean;
  messages: Message[];
  sendChatMessage: (recipientId: string, content: string, conversationId?: string | null) => { success: boolean };
  sendTypingIndicator: (recipientId: string, isTyping: boolean) => boolean;
  sendReadReceipt: (messageId: string) => boolean;
  onMessage: (type: WebSocketMessageType, handler: MessageHandler) => void;
  offMessage: (type: WebSocketMessageType) => void;
}

export const useWebSocket = (): UseWebSocketReturn => {
  const { token, user } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<number | null>(null);
  const messageHandlers = useRef<Record<string, MessageHandler>>({});

  const connect = useCallback(() => {
    if (!token || !user) return;

    const wsUrl = `${WS_URL}?token=${token}`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.current.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;
        console.log('WebSocket message:', data);

        // Call registered handlers
        if (messageHandlers.current[data.type]) {
          messageHandlers.current[data.type](data);
        }

        // Store message if it's a new message
        if ((data.type === 'new_message' || data.type === 'message_ack') && data.message) {
          setMessages(prev => [...prev, data.message!]);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.current.onerror = (error: Event) => {
      console.error('WebSocket error:', error);
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);

      // Attempt to reconnect after 3 seconds
      reconnectTimeout.current = setTimeout(() => {
        console.log('Attempting to reconnect...');
        connect();
      }, 3000);
    };
  }, [token, user]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((type: string, data: any): boolean => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type, data }));
      return true;
    }
    return false;
  }, []);

  const onMessage = useCallback((type: WebSocketMessageType, handler: MessageHandler) => {
    messageHandlers.current[type] = handler;
  }, []);

  const offMessage = useCallback((type: WebSocketMessageType) => {
    delete messageHandlers.current[type];
  }, []);

  const sendChatMessage = useCallback((recipientId: string, content: string, conversationId: string | null = null): { success: boolean } => {
    const success = sendMessage('send_message', {
      recipient_id: recipientId,
      conversation_id: conversationId,
      content,
      type: 'text'
    });
    return { success };
  }, [sendMessage]);

  const sendTypingIndicator = useCallback((recipientId: string, isTyping: boolean): boolean => {
    return sendMessage('typing', {
      recipient_id: recipientId,
      is_typing: isTyping
    });
  }, [sendMessage]);

  const sendReadReceipt = useCallback((messageId: string): boolean => {
    return sendMessage('read_receipt', {
      message_id: messageId
    });
  }, [sendMessage]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    messages,
    sendChatMessage,
    sendTypingIndicator,
    sendReadReceipt,
    onMessage,
    offMessage
  };
};

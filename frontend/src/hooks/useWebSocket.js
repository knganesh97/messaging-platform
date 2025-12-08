import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';

export const useWebSocket = () => {
  const { token, user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);
  const messageHandlers = useRef({});

  const connect = useCallback(() => {
    if (!token || !user) return;

    const wsUrl = `${WS_URL}?token=${token}`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message:', data);

        // Call registered handlers
        if (messageHandlers.current[data.type]) {
          messageHandlers.current[data.type](data);
        }

        // Store message if it's a new message
        if (data.type === 'new_message' || data.type === 'queued_message') {
          setMessages(prev => [...prev, data.message]);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.current.onerror = (error) => {
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

  const sendMessage = useCallback((type, data) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type, data }));
      return true;
    }
    return false;
  }, []);

  const onMessage = useCallback((type, handler) => {
    messageHandlers.current[type] = handler;
  }, []);

  const sendChatMessage = useCallback((recipientId, content, conversationId = null) => {
    return sendMessage('send_message', {
      recipient_id: recipientId,
      conversation_id: conversationId,
      content,
      type: 'text'
    });
  }, [sendMessage]);

  const sendTypingIndicator = useCallback((recipientId, isTyping) => {
    return sendMessage('typing', {
      recipient_id: recipientId,
      is_typing: isTyping
    });
  }, [sendMessage]);

  const sendReadReceipt = useCallback((messageId) => {
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
    onMessage
  };
};

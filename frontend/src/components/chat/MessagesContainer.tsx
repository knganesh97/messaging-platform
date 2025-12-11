import { useEffect, useRef } from 'react';
import { MessageItem } from '@/components/chat/MessageItem';
import { EmptyState, MessageBubbleIcon } from '@/components/common';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { MessagesContainerProps } from '@/components/types';

export const MessagesContainer = ({ 
  messages, 
  currentUserId,
  onRetry
}: MessagesContainerProps) => {
  const { sendReadReceipt } = useWebSocket();
  const observedMessages = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    // Send read receipts for received messages
    messages.forEach(msg => {
      if (
        msg.sender_id !== currentUserId && // Not our own message
        msg.id && 
        !msg.id.startsWith('temp-') && // Has real server ID
        !observedMessages.current.has(msg.id) // Not already marked as read
      ) {
        sendReadReceipt(msg.id);
        observedMessages.current.add(msg.id);
      }
    });
  }, [messages, currentUserId, sendReadReceipt]);
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <EmptyState 
          title="No messages yet" 
          message="Start the conversation!"
          icon={<MessageBubbleIcon className="w-16 h-16" />}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
      {messages.map((msg, index) => (
        <MessageItem
          key={msg.id || index}
          message={msg}
          isSent={msg.sender_id === currentUserId}
          onRetry={onRetry}
        />
      ))}
    </div>
  );
};

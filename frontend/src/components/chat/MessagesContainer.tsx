import { MessageItem } from '@/components/chat/MessageItem';
import { EmptyState } from '@/components/common';
import type { MessagesContainerProps } from '@/components/types';

export const MessagesContainer = ({ 
  messages, 
  currentUserId 
}: MessagesContainerProps) => {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <EmptyState 
          title="No messages yet" 
          message="Start the conversation!"
          icon={
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          }
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
        />
      ))}
    </div>
  );
};

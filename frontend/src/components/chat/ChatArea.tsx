import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessagesContainer } from '@/components/chat/MessagesContainer';
import { MessageInput } from '@/components/chat/MessageInput';
import { EmptyState } from '@/components/common';
import { useChatContext } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { ChatAreaProps } from '@/components/types';

export const ChatArea = ({ selectedContact }: ChatAreaProps) => {
  const { user } = useAuth();
  const { isConnected } = useWebSocket();
  const { 
    messages, 
    newMessage, 
    setNewMessage, 
    handleSendMessage 
  } = useChatContext();

  if (!selectedContact) {
    return (
      <div className="flex-1 bg-white">
        <EmptyState 
          title="Select a contact to start chatting"
          icon={
            <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      <ChatHeader contact={selectedContact} />
      <MessagesContainer 
        messages={messages} 
        currentUserId={user?.id}
      />
      <MessageInput
        value={newMessage}
        onChange={setNewMessage}
        onSubmit={handleSendMessage}
        disabled={!isConnected}
      />
    </div>
  );
};

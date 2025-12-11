import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessagesContainer } from '@/components/chat/MessagesContainer';
import { MessageInput } from '@/components/chat/MessageInput';
import { EmptyState, ChatBubbleIcon } from '@/components/common';
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
    handleSendMessage,
    retryMessage
  } = useChatContext();

  if (!selectedContact) {
    return (
      <div className="flex-1 bg-white">
        <EmptyState 
          title="Select a contact to start chatting"
          icon={<ChatBubbleIcon className="w-20 h-20" />}
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
        onRetry={retryMessage}
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

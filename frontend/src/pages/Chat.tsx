import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ChatProvider } from '@/contexts/ChatContext';
import { Sidebar, ChatArea } from '@/components/chat';
import { LoadingSpinner } from '@/components/common';
import { useChatContext } from '@/contexts/ChatContext';

function ChatContent() {
  const { user, logout } = useAuth();
  const { isConnected } = useWebSocket();
  const { loading, selectedContact } = useChatContext();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <LoadingSpinner message="Loading..." />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        user={user} 
        isConnected={isConnected} 
        onLogout={logout} 
      />
      <ChatArea selectedContact={selectedContact} />
    </div>
  );
}

function Chat() {
  return (
    <ChatProvider>
      <ChatContent />
    </ChatProvider>
  );
}

export default Chat;

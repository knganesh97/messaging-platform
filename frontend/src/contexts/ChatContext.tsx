import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { contactAPI, messageAPI } from '@/services/api';
import type { Contact, Conversation, Message, WebSocketMessage } from '@/types';
import { AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';

interface ChatContextType {
  // State
  contacts: Contact[];
  conversations: Conversation[];
  selectedContact: Contact | null;
  selectedConversation: string | null;
  messages: Message[];
  newMessage: string;
  loading: boolean;
  showAddContact: boolean;
  newContactUsername: string;
  addContactError: string;
  
  // Actions
  setNewMessage: (message: string) => void;
  setShowAddContact: (show: boolean) => void;
  setNewContactUsername: (username: string) => void;
  setAddContactError: (error: string) => void;
  handleSelectContact: (contact: Contact) => Promise<void>;
  handleSendMessage: () => void;
  handleAddContact: (username: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  retryMessage: (tempId: string) => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider = ({ children }: ChatProviderProps) => {
  const { sendChatMessage, onMessage } = useWebSocket();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddContact, setShowAddContact] = useState<boolean>(false);
  const [newContactUsername, setNewContactUsername] = useState<string>('');
  const [addContactError, setAddContactError] = useState<string>('');
  const pendingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    loadInitialData();
    // Get current user ID from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUserId(user.id);
      } catch (error) {
        console.error('Failed to parse user from localStorage:', error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Handle incoming WebSocket messages
    onMessage('new_message', (data: WebSocketMessage) => {
      if (selectedConversation && data.message && data.message.conversation_id === selectedConversation) {
        setMessages(prev => {
          // Prevent duplicates by checking if message already exists
          if (prev.some(m => m.id === data.message!.id)) {
            return prev;
          }
          return [...prev, data.message!];
        });
      }
      // Refresh conversations list
      loadConversations();
    });

    onMessage('message_ack', (data: WebSocketMessage) => {
      const { temp_id, server_id, timestamp, status, error } = data;
      
      if (!temp_id) return;

      // Clear timeout for this message
      const timeout = pendingTimeouts.current.get(temp_id);
      if (timeout) {
        clearTimeout(timeout);
        pendingTimeouts.current.delete(temp_id);
      }

      setMessages(prev => {
        // Find the pending message by temp_id
        const messageIndex = prev.findIndex(m => m.temp_id === temp_id);
        if (messageIndex === -1) return prev;

        const updatedMessages = [...prev];
        
        if (error) {
          // Mark message as failed
          updatedMessages[messageIndex] = {
            ...updatedMessages[messageIndex],
            status: 'failed',
            error: error
          };
        } else {
          // Update with server ID and mark as sent
          updatedMessages[messageIndex] = {
            ...updatedMessages[messageIndex],
            id: server_id || updatedMessages[messageIndex].id,
            timestamp: timestamp || updatedMessages[messageIndex].timestamp,
            status: status as Message['status'] || 'sent',
            temp_id: temp_id // Keep temp_id for reference
          };
        }

        return updatedMessages;
      });

      // Refresh conversations list if successful
      if (!error) {
        loadConversations();
      }
    });

    onMessage('status_update', (data: WebSocketMessage) => {
      const { message_id, status } = data;
      
      if (!message_id || !status) return;

      setMessages(prev => prev.map(m => 
        m.id === message_id 
          ? { ...m, status: status as Message['status'] }
          : m
      ));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation, onMessage]);

  const loadInitialData = async () => {
    try {
      const [contactsRes, conversationsRes] = await Promise.all([
        contactAPI.getContacts(),
        messageAPI.getConversations()
      ]);
      setContacts(contactsRes.data || []);
      setConversations(conversationsRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      setContacts([]);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async () => {
    try {
      const res = await messageAPI.getConversations();
      setConversations(res.data || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const res = await messageAPI.getMessages(conversationId);
      setMessages(res.data || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    }
  };

  const handleSelectContact = async (contact: Contact) => {
    setSelectedContact(contact);
    
    // Find existing conversation with this contact
    const existingConv = conversations.find(conv => 
      conv.participants.includes(contact.id)
    );

    if (existingConv) {
      setSelectedConversation(existingConv.id);
      await loadMessages(existingConv.id);
    } else {
      setSelectedConversation(null);
      setMessages([]);
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedContact || !currentUserId) return;

    const tempId = `temp-${uuidv4()}`;
    const messageContent = newMessage.trim();
    
    // Create optimistic message
    const optimisticMessage: Message = {
      id: tempId,
      temp_id: tempId,
      conversation_id: selectedConversation || 'pending',
      sender_id: currentUserId,
      content: messageContent,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');

    // Send message via WebSocket
    const result = sendChatMessage(
      selectedContact.id,
      messageContent,
      selectedConversation,
      tempId // Pass temp_id to backend
    );

    if (!result.success) {
      // Mark message as failed if send failed
      setMessages(prev => prev.map(m => 
        m.temp_id === tempId 
          ? { ...m, status: 'failed', error: 'Failed to send message' }
          : m
      ));
      return;
    }

    // Set timeout to mark message as failed after 15 seconds
    const timeout = setTimeout(() => {
      setMessages(prev => prev.map(m => 
        m.temp_id === tempId && m.status === 'pending'
          ? { ...m, status: 'failed', error: 'Message send timeout' }
          : m
      ));
      pendingTimeouts.current.delete(tempId);
    }, 15000);

    pendingTimeouts.current.set(tempId, timeout);
  };

  const retryMessage = (tempId: string) => {
    const message = messages.find(m => m.temp_id === tempId);
    if (!message || !selectedContact) return;

    // Update message status to pending
    setMessages(prev => prev.map(m => 
      m.temp_id === tempId 
        ? { ...m, status: 'pending', error: undefined }
        : m
    ));

    // Resend message
    const result = sendChatMessage(
      selectedContact.id,
      message.content,
      selectedConversation,
      tempId
    );

    if (!result.success) {
      setMessages(prev => prev.map(m => 
        m.temp_id === tempId 
          ? { ...m, status: 'failed', error: 'Failed to send message' }
          : m
      ));
      return;
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      setMessages(prev => prev.map(m => 
        m.temp_id === tempId && m.status === 'pending'
          ? { ...m, status: 'failed', error: 'Message send timeout' }
          : m
      ));
      pendingTimeouts.current.delete(tempId);
    }, 15000);

    pendingTimeouts.current.set(tempId, timeout);
  };

  const handleAddContact = async (username: string) => {
    setAddContactError('');
    
    if (!username.trim()) {
      setAddContactError('Please enter a username');
      return;
    }

    try {
      const searchRes = await contactAPI.searchUsers(username);
      
      if (!searchRes.data || searchRes.data.length === 0) {
        setAddContactError('User not found');
        return;
      }

      const userToAdd = searchRes.data[0];
      await contactAPI.addContact(userToAdd.id);
      
      const contactsRes = await contactAPI.getContacts();
      setContacts(contactsRes.data || []);
      
      setNewContactUsername('');
      setShowAddContact(false);
      setAddContactError('');
    } catch (error) {
      console.error('Failed to add contact:', error);
      const axiosError = error as AxiosError<{ error: string }>;
      setAddContactError(axiosError.response?.data?.error || 'Failed to add contact');
    }
  };

  return (
    <ChatContext.Provider
      value={{
        contacts,
        conversations,
        selectedContact,
        selectedConversation,
        messages,
        newMessage,
        loading,
        showAddContact,
        newContactUsername,
        addContactError,
        setNewMessage,
        setShowAddContact,
        setNewContactUsername,
        setAddContactError,
        handleSelectContact,
        handleSendMessage,
        handleAddContact,
        loadConversations,
        retryMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
};

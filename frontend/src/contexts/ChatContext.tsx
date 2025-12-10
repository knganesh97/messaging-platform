import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { contactAPI, messageAPI } from '@/services/api';
import type { Contact, Conversation, Message, WebSocketMessage } from '@/types';
import { AxiosError } from 'axios';

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

  useEffect(() => {
    loadInitialData();
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
      if (selectedConversation && data.message && data.message.conversation_id === selectedConversation) {
        setMessages(prev => {
          // Prevent duplicates by checking if message already exists
          if (prev.some(m => m.id === data.message!.id)) {
            return prev;
          }
          return [...prev, data.message!];
        });
      }
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
    if (!newMessage.trim() || !selectedContact) return;

    const result = sendChatMessage(
      selectedContact.id,
      newMessage.trim(),
      selectedConversation
    );

    if (result.success) {
      setNewMessage('');
    }
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

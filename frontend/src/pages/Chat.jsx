import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { contactAPI, messageAPI } from '../services/api';
import './Chat.css';

function Chat() {
  const { user, logout } = useAuth();
  const { isConnected, messages: wsMessages, sendChatMessage, onMessage } = useWebSocket();
  const [contacts, setContacts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactUsername, setNewContactUsername] = useState('');
  const [addContactError, setAddContactError] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    // Handle incoming WebSocket messages
    onMessage('new_message', (data) => {
      if (selectedConversation && data.message.conversation_id === selectedConversation) {
        setMessages(prev => [...prev, data.message]);
      }
      // Refresh conversations list
      loadConversations();
    });

    onMessage('queued_message', (data) => {
      if (selectedConversation && data.message.conversation_id === selectedConversation) {
        setMessages(prev => [...prev, data.message]);
      }
    });
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

  const loadMessages = async (conversationId) => {
    try {
      const res = await messageAPI.getMessages(conversationId);
      setMessages(res.data || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    }
  };

  const handleSelectContact = async (contact) => {
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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact) return;

    const success = sendChatMessage(
      selectedContact.id,
      newMessage.trim(),
      selectedConversation
    );

    if (success) {
      setNewMessage('');
      // Message will be added when we receive the ACK from server
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    setAddContactError('');
    
    if (!newContactUsername.trim()) {
      setAddContactError('Please enter a username');
      return;
    }

    try {
      // First search for the user
      const searchRes = await contactAPI.searchUsers(newContactUsername);
      
      if (!searchRes.data || searchRes.data.length === 0) {
        setAddContactError('User not found');
        return;
      }

      const userToAdd = searchRes.data[0];
      
      // Add as contact
      await contactAPI.addContact(userToAdd.id);
      
      // Reload contacts
      const contactsRes = await contactAPI.getContacts();
      setContacts(contactsRes.data || []);
      
      setNewContactUsername('');
      setShowAddContact(false);
      setAddContactError('');
    } catch (error) {
      console.error('Failed to add contact:', error);
      setAddContactError(error.response?.data?.error || 'Failed to add contact');
    }
  };

  if (loading) {
    return (
      <div className="chat-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="user-info">
            <h3>{user?.username}</h3>
            <span className={`status ${isConnected ? 'online' : 'offline'}`}>
              {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>

        <div className="contacts-list">
          <div className="contacts-header">
            <h4>Contacts</h4>
            <button 
              className="add-contact-btn"
              onClick={() => setShowAddContact(!showAddContact)}
            >
              +
            </button>
          </div>

          {showAddContact && (
            <form className="add-contact-form" onSubmit={handleAddContact}>
              <input
                type="text"
                value={newContactUsername}
                onChange={(e) => setNewContactUsername(e.target.value)}
                placeholder="Enter username..."
                autoFocus
              />
              <div className="form-buttons">
                <button type="submit">Add</button>
                <button type="button" onClick={() => {
                  setShowAddContact(false);
                  setNewContactUsername('');
                  setAddContactError('');
                }}>
                  Cancel
                </button>
              </div>
              {addContactError && <p className="error-message">{addContactError}</p>}
            </form>
          )}

          {contacts.length === 0 ? (
            <p className="empty-message">No contacts yet. Click + to add someone!</p>
          ) : (
            contacts.map(contact => (
              <div
                key={contact.id}
                className={`contact-item ${selectedContact?.id === contact.id ? 'active' : ''}`}
                onClick={() => handleSelectContact(contact)}
              >
                <div className="contact-avatar">
                  {contact.username.charAt(0).toUpperCase()}
                </div>
                <div className="contact-info">
                  <div className="contact-name">{contact.username}</div>
                  <div className="contact-status">
                    {contact.presence?.status || 'offline'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="chat-area">
        {selectedContact ? (
          <>
            <div className="chat-header">
              <div className="contact-avatar">
                {selectedContact.username.charAt(0).toUpperCase()}
              </div>
              <div className="contact-info">
                <h3>{selectedContact.username}</h3>
                <span className="status">
                  {selectedContact.presence?.status || 'offline'}
                </span>
              </div>
            </div>

            <div className="messages-container">
              {messages.length === 0 ? (
                <p className="empty-message">No messages yet. Start the conversation!</p>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={msg.id || index}
                    className={`message ${msg.sender_id === user.id ? 'sent' : 'received'}`}
                  >
                    <div className="message-content">{msg.content}</div>
                    <div className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>

            <form className="message-input" onSubmit={handleSendMessage}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                disabled={!isConnected}
              />
              <button type="submit" disabled={!isConnected || !newMessage.trim()}>
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="no-chat-selected">
            <h2>Select a contact to start chatting</h2>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;

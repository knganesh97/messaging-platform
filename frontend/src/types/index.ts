// User types
export interface User {
  id: string;
  username: string;
  email: string;
  created_at?: string;
}

// Contact types
export interface Contact {
  id: string;
  username: string;
  email?: string;
  status?: 'online' | 'offline';
  last_seen?: string;
}

// Message types
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  timestamp: string;
  status?: MessageStatus;
  temp_id?: string; // Temporary ID for optimistic updates
  error?: string; // Error message if send failed
}

// Conversation types
export interface Conversation {
  id: string;
  participants: string[];
  last_message?: Message;
  unread_count?: number;
  created_at?: string;
}

// WebSocket message types
export type WebSocketMessageType = 
  | 'new_message'
  | 'message_ack'
  | 'status_update'
  | 'typing'
  | 'read_receipt'
  | 'user_status'
  | 'error';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  message?: Message;
  conversation_id?: string;
  user_id?: string;
  status?: string;
  error?: string;
  [key: string]: any;
}

// API Response types
export interface APIResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginResult {
  success: boolean;
  error?: string;
}

// Form types
export interface LoginFormData {
  username: string;
  password: string;
}

export interface RegisterFormData extends LoginFormData {
  email: string;
}

// Context types
export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<LoginResult>;
  register: (username: string, email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  loading: boolean;
}

export interface WebSocketContextType {
  isConnected: boolean;
  messages: WebSocketMessage[];
  sendChatMessage: (conversationId: string, content: string) => Promise<{ success: boolean }>;
  onMessage: (type: WebSocketMessageType, handler: (data: WebSocketMessage) => void) => void;
  offMessage: (type: WebSocketMessageType) => void;
}

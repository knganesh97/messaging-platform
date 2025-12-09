import type { Contact, Message, User } from '@/types';

// Common component props
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export interface AvatarProps {
  username: string;
  size?: 'sm' | 'md' | 'lg';
  status?: 'online' | 'offline';
}

export interface ErrorMessageProps {
  message: string;
}

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

// Auth component props
export interface LoginFormProps {
  isLogin: boolean;
  onSubmit: (username: string, email: string, password: string) => Promise<void>;
  error?: string;
  loading?: boolean;
}

export interface AuthToggleProps {
  isLogin: boolean;
  onToggle: () => void;
}

// Chat sidebar component props
export interface SidebarProps {
  user: User | null;
  isConnected: boolean;
  onLogout: () => void;
}

export interface SidebarHeaderProps {
  username?: string;
  isConnected: boolean;
  onLogout: () => void;
}

export interface ContactsListProps {
  contacts: Contact[];
  selectedContactId?: string;
  onSelectContact: (contact: Contact) => void;
}

export interface ContactItemProps {
  contact: Contact;
  isActive: boolean;
  onClick: () => void;
}

export interface AddContactFormProps {
  onAdd: (username: string) => Promise<void>;
  onCancel: () => void;
  error?: string;
}

// Chat area component props
export interface ChatAreaProps {
  selectedContact: Contact | null;
}

export interface ChatHeaderProps {
  contact: Contact;
}

export interface MessagesContainerProps {
  messages: Message[];
  currentUserId?: string;
}

export interface MessageItemProps {
  message: Message;
  isSent: boolean;
}

export interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: React.ReactNode;
}

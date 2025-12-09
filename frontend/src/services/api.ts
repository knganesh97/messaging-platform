import axios, { AxiosInstance } from 'axios';
import type { User, Contact, Conversation, Message } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const userAPI = {
  getMe: () => api.get<User>('/users/me'),
  updateMe: (data: Partial<User>) => api.put<User>('/users/me', data),
  search: (query: string) => api.get<User[]>(`/users/search?q=${query}`),
  getById: (id: string) => api.get<User>(`/users/${id}`),
};

export const contactAPI = {
  getContacts: () => api.get<Contact[]>('/contacts'),
  addContact: (contactId: string) => api.post<void>('/contacts', { contact_id: contactId }),
  removeContact: (contactId: string) => api.delete<void>(`/contacts/${contactId}`),
  searchUsers: (query: string) => api.get<User[]>(`/users/search?q=${query}`),
};

export const messageAPI = {
  getConversations: () => api.get<Conversation[]>('/messages/conversations'),
  getMessages: (conversationId: string) => api.get<Message[]>(`/messages/conversations/${conversationId}`),
  sendMessage: (data: { conversation_id: string; content: string }) => api.post<Message>('/messages', data),
  updateStatus: (messageId: string, status: string) => api.put<void>(`/messages/${messageId}/status`, { status }),
};

export default api;

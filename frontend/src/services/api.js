import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const api = axios.create({
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
  getMe: () => api.get('/users/me'),
  updateMe: (data) => api.put('/users/me', data),
  search: (query) => api.get(`/users/search?q=${query}`),
  getById: (id) => api.get(`/users/${id}`),
};

export const contactAPI = {
  getContacts: () => api.get('/contacts'),
  addContact: (contactId) => api.post('/contacts', { contact_id: contactId }),
  removeContact: (contactId) => api.delete(`/contacts/${contactId}`),
  searchUsers: (query) => api.get(`/users/search?q=${query}`),
};

export const messageAPI = {
  getConversations: () => api.get('/messages/conversations'),
  getMessages: (conversationId) => api.get(`/messages/conversations/${conversationId}`),
  sendMessage: (data) => api.post('/messages', data),
  updateStatus: (messageId, status) => api.put(`/messages/${messageId}/status`, { status }),
};

export default api;

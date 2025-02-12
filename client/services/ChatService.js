import io from 'socket.io-client';
import axios from 'axios';

class ChatService {
  constructor() {
    this.socket = null;
    this.baseURL = 'http://localhost:5001';
  }

  connect(token) {
    this.socket = io(this.baseURL, {
      auth: {
        token
      }
    });

    this.socket.on('connect', () => {
      console.log('Connected to chat server');
    });

    this.socket.on('error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinChat(chatId) {
    if (this.socket) {
      this.socket.emit('join', chatId);
    }
  }

  leaveChat(chatId) {
    if (this.socket) {
      this.socket.emit('leave', chatId);
    }
  }

  onNewMessage(callback) {
    if (this.socket) {
      this.socket.on('newMessage', callback);
    }
  }

  async getAllChats() {
    try {
      const response = await axios.get(`${this.baseURL}/api/chats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching chats:', error);
      throw error;
    }
  }

  async getChat(chatId) {
    try {
      const response = await axios.get(`${this.baseURL}/api/chats/${chatId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching chat:', error);
      throw error;
    }
  }

  async createChat(participantId) {
    try {
      const response = await axios.post(`${this.baseURL}/api/chats`, {
        participantId
      });
      return response.data;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  }

  async sendMessage(chatId, content) {
    try {
      const response = await axios.post(`${this.baseURL}/api/chats/${chatId}/messages`, {
        content
      });
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async markMessagesAsRead(chatId) {
    try {
      const response = await axios.patch(`${this.baseURL}/api/chats/${chatId}/read`);
      return response.data;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }
}

export default new ChatService();
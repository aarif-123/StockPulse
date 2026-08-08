import { api } from './api';
import type { User } from '../types';

export interface LoginResponse {
  message?: string;
  token: string;
  user: User;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    return response.data;
  },
};

import { api } from './api';
import type { User, UserOrganizationSummary } from '../types';

export interface LoginResponse {
  message?: string;
  token: string;
  user: User;
  organizations: UserOrganizationSummary[];
}

export interface RegisterResponse {
  token: string;
  user: User;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    return response.data;
  },

  async register(data: {
    name: string;
    email: string;
    password: string;
    organizationName: string;
    organizationSlug: string;
  }): Promise<RegisterResponse> {
    const response = await api.post<RegisterResponse>('/auth/register', data);
    return response.data;
  },
};

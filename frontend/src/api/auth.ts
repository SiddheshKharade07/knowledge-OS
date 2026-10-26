import { http } from './client';
import type {
  AuthResponse,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  PasswordMessage,
  ResetPasswordRequest,
} from './types';

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const res = await http.post<AuthResponse>('/auth/login', data);
    return res.data;
  },
  forgotPassword: async (data: ForgotPasswordRequest): Promise<PasswordMessage> => {
    const res = await http.post<PasswordMessage>('/auth/password/forgot', data);
    return res.data;
  },
  resetPassword: async (data: ResetPasswordRequest): Promise<PasswordMessage> => {
    const res = await http.post<PasswordMessage>('/auth/password/reset', data);
    return res.data;
  },
  setupPassword: async (data: ResetPasswordRequest): Promise<PasswordMessage> => {
    const res = await http.post<PasswordMessage>('/auth/password/setup', data);
    return res.data;
  },
  changePassword: async (data: ChangePasswordRequest): Promise<PasswordMessage> => {
    const res = await http.post<PasswordMessage>('/auth/password/change', data);
    return res.data;
  },
};

import { create } from 'zustand';
import type { UserProfile } from '../api/types';

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  setAuth: (token: string, user: UserProfile | null) => void;
  logout: () => void;
}

function readInitialState(): { token: string | null; user: UserProfile | null } {
  try {
    const token = localStorage.getItem('knowledgeos.token');
    const userRaw = localStorage.getItem('knowledgeos.user');
    const user = userRaw ? (JSON.parse(userRaw) as UserProfile) : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

export const useAuthStore = create<AuthState>((set) => {
  const initial = readInitialState();
  return {
    token: initial.token,
    user: initial.user,
    setAuth: (token, user) => {
      try {
        localStorage.setItem('knowledgeos.token', token);
        if (user) {
          localStorage.setItem('knowledgeos.user', JSON.stringify(user));
        } else {
          localStorage.removeItem('knowledgeos.user');
        }
      } catch {
        // ignore storage errors
      }
      set({ token, user });
    },
    logout: () => {
      try {
        localStorage.removeItem('knowledgeos.token');
        localStorage.removeItem('knowledgeos.user');
      } catch {
        // ignore
      }
      set({ token: null, user: null });
    },
  };
});

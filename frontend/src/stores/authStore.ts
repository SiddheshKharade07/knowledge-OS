import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile, UserProfileResponse } from '../api/types';

interface AuthState {
  token: string | null;
  user: UserProfile | UserProfileResponse | null;
  setAuth: (token: string, user: UserProfile | UserProfileResponse | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      clearAuth: () => set({ token: null, user: null }),
    }),
    { name: 'knowledgeos-auth' },
  ),
);
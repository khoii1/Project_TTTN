import { create } from 'zustand';
import { User } from './auth.types';
import { tokenStorage } from '@/lib/api/token-storage';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
  setInitialized: (val: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!tokenStorage.getAccessToken(),
  isInitialized: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => {
    tokenStorage.clearAll();
    set({ user: null, isAuthenticated: false });
  },
  setInitialized: (val) => set({ isInitialized: val }),
}));

import { create } from 'zustand';
import { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  role: 'admin' | 'staff' | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  setUser: (user) => {
    let role = null;
    if (user) {
      role = user.user_metadata?.role || 'staff';
    }
    set({ user, role });
  },
  isLoading: true,
  setIsLoading: (isLoading) => set({ isLoading }),
}));

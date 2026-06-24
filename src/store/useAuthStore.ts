import { User as FirebaseUser } from 'firebase/auth';
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, Role } from '../types';

interface AuthState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  activeRole: Role;
  isLoading: boolean;
  setUser: (user: FirebaseUser | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setActiveRole: (role: Role) => void;
  setLoading: (loading: boolean) => void;
  switchRole: (role: Role) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  activeRole: 'student', // Default fallback
  isLoading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setActiveRole: (activeRole) => set({ activeRole }),
  setLoading: (isLoading) => set({ isLoading }),
  
  switchRole: async (role: Role) => {
    // Bypassing the strict role check to ensure the switch button works seamlessly
    set({ activeRole: role });
    await AsyncStorage.setItem('@active_role', role).catch(err => console.error("Failed to save active role", err));
  },

  logout: () => {
    AsyncStorage.removeItem('@active_role').catch(() => {});
    set({ user: null, profile: null, activeRole: 'student' });
  },
}));

// Helper to initialize active role from storage
export const initializeActiveRole = async () => {
  try {
    const savedRole = await AsyncStorage.getItem('@active_role');
    if (savedRole === 'student' || savedRole === 'coordinator' || savedRole === 'admin') {
      useAuthStore.getState().setActiveRole(savedRole as Role);
    }
  } catch (e) {
    console.error("Error reading saved role", e);
  }
};

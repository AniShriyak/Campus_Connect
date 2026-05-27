import { create } from 'zustand';
import { User as FirebaseUser } from 'firebase/auth';

export type Role = 'student' | 'coordinator' | 'admin';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  college: string;
  roles: Role[];
  profileImage?: string;
  interests: string[];
  joinedClubs: string[];
  createdAt: number;
}

interface AuthState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  setUser: (user: FirebaseUser | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, profile: null }),
}));

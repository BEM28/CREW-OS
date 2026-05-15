import { create } from 'zustand';

export interface UserData {
  uid: string;
  name: string;
  email: string;
  photoURL: string | null;
  onboardingComplete: boolean;
  activeCompanyId: string | null;
  activeProjectId: string | null;
  lastSessionId: string | null;
  lastWorkspaceVisited: string | null;
}

interface UserState {
  user: UserData | null;
  loading: boolean;
  setUser: (user: UserData | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
}));

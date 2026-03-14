import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import client from '../api/client';
import type { LoginDto, RegisterDto } from '@mindsphere/shared';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'LEARNER' | 'ADMIN' | 'ANALYST';
  level: number;
  currentXP: number;
  currentStreak: number;
  accessToken?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginDto) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      const res = await client.get('/api/profile');
      setUser(prev => ({ ...prev, ...res.data }));
      // Update localStorage lightly or fully? 
      // Merging is safer if localStorage has partial data
      const old = localStorage.getItem('user');
      const merged = { ...(old ? JSON.parse(old) : {}), ...res.data };
      localStorage.setItem('user', JSON.stringify(merged));
    } catch (error) {
      console.error('Failed to refresh profile', error);
      // Don't logout here, maybe just network error
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
          // Only try to fetch fresh profile if we have a session
          await refreshProfile();
        }
      } catch (error) {
        console.error('Auth check failed', error);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();

    // Cross-tab sync: Update state if user changes in another tab
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user') {
        if (e.newValue) {
          console.log('[AUTH] Syncing user from another tab');
          setUser(JSON.parse(e.newValue));
        } else {
          console.log('[AUTH] Logged out from another tab');
          setUser(null);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = async (data: LoginDto) => {
    const res = await client.post('/api/auth/login', data);
    const userWithToken = { ...res.data.user, accessToken: res.data.tokens.accessToken };
    setUser(userWithToken);
    localStorage.setItem('user', JSON.stringify(userWithToken));
  };

  const register = async (data: RegisterDto) => {
    const res = await client.post('/api/auth/register', data);
    const userWithToken = { ...res.data.user, accessToken: res.data.tokens.accessToken };
    setUser(userWithToken);
    localStorage.setItem('user', JSON.stringify(userWithToken));
  };

  const logout = async () => {
    try {
      await client.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout API failed', error);
    } finally {
      setUser(null);
      localStorage.removeItem('user');
      // If we use cookies, we might need to force reload or just trust the backend cleared them.
      // But clearing local state is key for UI.
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

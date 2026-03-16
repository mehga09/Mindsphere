import React, { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from './AuthContext';

interface Badge {
    id: string;
    name: string;
    description: string;
    iconUrl: string;
    category: string;
}

interface Theme {
    id: string;
    name: string;
    xpCost: number;
    cssConfig: any;
    isUnlocked: boolean;
}

interface UserChallenge {
    id: string;
    challengeId: string;
    progress: number;
    target: number;
    isCompleted: boolean;
}

interface UserStats {
    level: number;
    xp: number;
    streak: number;
    badges: Badge[];
    activeThemeId: string | null;
    challenges: UserChallenge[];
}

interface GamificationContextType {
    stats: UserStats | null;
    themes: Theme[];
    loading: boolean;
    refreshStats: () => Promise<void>;
    refreshThemes: () => Promise<void>;
    unlockTheme: (themeId: string) => Promise<void>;
    setActiveTheme: (themeId: string) => Promise<void>;
    joinChallenge: (challengeId: string) => Promise<void>;
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export const GamificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [stats, setStats] = useState<UserStats | null>(null);
    const [themes, setThemes] = useState<Theme[]>([]);
    const [loading, setLoading] = useState(false);

    const refreshStats = async () => {
        try {
            const res = await client.get('/api/gamification/stats');
            setStats(res.data);
            
            // Auto-apply theme if set
            if (res.data.activeThemeId) {
                const currentThemes = themes.length > 0 ? themes : (await client.get('/api/gamification/themes')).data;
                const activeTheme = currentThemes.find((t: any) => t.id === res.data.activeThemeId);
                if (activeTheme) applyTheme(activeTheme.cssConfig);
            }
        } catch (err) {
            console.error('Failed to fetch stats', err);
        }
    };

    const refreshThemes = async () => {
        try {
            const res = await client.get('/api/gamification/themes');
            setThemes(res.data);
            return res.data;
        } catch (err) {
            console.error('Failed to fetch themes', err);
            return [];
        }
    };

    const applyTheme = (config: any) => {
        const root = document.documentElement;
        Object.entries(config).forEach(([key, value]) => {
            root.style.setProperty(`--theme-${key}`, value as string);
        });
        root.classList.add('app-themed');
    };

    const unlockTheme = async (themeId: string) => {
        await client.post(`/api/gamification/themes/${themeId}/unlock`);
        await refreshThemes();
        await refreshStats();
    };

    const setActiveTheme = async (themeId: string) => {
        await client.post('/api/gamification/themes/active', { themeId });
        const theme = themes.find(t => t.id === themeId);
        if (theme) applyTheme(theme.cssConfig);
        await refreshStats();
    };

    const joinChallenge = async (challengeId: string) => {
        try {
            await client.post(`/api/gamification/challenges/${challengeId}/join`);
            await refreshStats();
        } catch (err) {
            console.error('Failed to join challenge', err);
            throw err;
        }
    };

    useEffect(() => {
        if (user) {
            const init = async () => {
                setLoading(true);
                await refreshThemes();
                await refreshStats();
                setLoading(false);
            };
            init();
        } else {
            setStats(null);
            const root = document.documentElement;
            root.removeAttribute('style');
            root.classList.remove('app-themed');
        }
    }, [user]);

    return (
        <GamificationContext.Provider value={{ stats, themes, loading, refreshStats, refreshThemes, unlockTheme, setActiveTheme, joinChallenge }}>
            {children}
        </GamificationContext.Provider>
    );
};

export const useGamification = () => {
    const context = useContext(GamificationContext);
    if (!context) throw new Error('useGamification must be used within GamificationProvider');
    return context;
};

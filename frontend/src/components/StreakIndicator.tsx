import React from 'react';
import { useGamification } from '../context/GamificationContext';

const StreakIndicator: React.FC = () => {
    const { stats, loading } = useGamification();

    if (loading || !stats) return null;

    const streakCount = stats.streak;
    const hasStreak = streakCount > 0;

    return (
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full transition-all duration-300 ${
            hasStreak 
                ? 'bg-orange-500/10 border border-orange-500/30' 
                : 'bg-slate-800/50 border border-slate-700'
        }`}>
            <span className={`text-xl ${hasStreak ? 'animate-pulse' : 'grayscale'}`}>
                🔥
            </span>
            <div className="flex flex-col leading-none">
                <span className={`text-sm font-bold ${hasStreak ? 'text-orange-400' : 'text-slate-400'}`}>
                    {streakCount}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500">
                    Streak
                </span>
            </div>
        </div>
    );
};

export default StreakIndicator;

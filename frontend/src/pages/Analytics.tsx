import { useState, useEffect } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import client from '../api/client';

import { useAuth } from '../context/AuthContext';
import { useGamification } from '../context/GamificationContext';
import { Link } from 'react-router-dom';
import { ArrowLeft, Zap, Activity, Flame, Trophy, Palette, Check, Lock, Target } from 'lucide-react';

interface WeeklyReport {
  weekStartDate: string;
  totalSessions: number;
  totalProductiveMins: number;
  score: number;
  chartData: { 
    daily?: { day: string; minutes: number }[];
    subjects?: { subject: string; minutes: number; fullMark: number }[];
  };
}

export default function Analytics() {
  const { user } = useAuth();
  const { stats, themes, unlockTheme, setActiveTheme, joinChallenge, loading: gamificationLoading } = useGamification();
  const [joining, setJoining] = useState(false);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await client.get('/api/reports/latest');
        if (res.data && typeof res.data === 'object') {
          // Normalize legacy chart data if needed
          if (Array.isArray(res.data.chartData)) {
            res.data.chartData = { daily: res.data.chartData, subjects: [] };
          }
          setReport(res.data);
        }
      } catch (error) {
        console.error('Failed to fetch report', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  if (loading || gamificationLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  const dailyData = report?.chartData?.daily || [];
  const subjectData = report?.chartData?.subjects || [];

  return (
    <div className="min-h-screen relative overflow-hidden pb-20 font-sans selection:bg-purple-500 selection:text-white transition-colors duration-500">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-500/30 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-blob"></div>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/30 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-blob animation-delay-2000"></div>
 
      <header className="fixed top-0 w-full z-50 bg-white/5 backdrop-blur-md shadow-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-300 hover:text-white"><ArrowLeft size={20} /></Link>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300">Learning Insights</h1>
              <span className="text-xs font-medium text-gray-400 tracking-wide uppercase">Achievement System Beta</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">{stats?.xp || 0} XP</span>
                <span className="text-[10px] text-gray-500 font-bold uppercase">Balance</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-28 pb-12 space-y-8 relative z-10 animate-fade-in">

        {/* Top Grid: Achievement Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 text-center group hover:bg-white/10 transition-all">
                <div className="mx-auto w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 mb-2">
                    <Trophy size={20} />
                </div>
                <p className="text-xl font-black text-white">Lvl {stats?.level || 1}</p>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Current Tier</p>
            </div>
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 text-center group hover:bg-white/10 transition-all">
                <div className="mx-auto w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 mb-2">
                    <Flame size={20} />
                </div>
                <p className="text-xl font-black text-white">{stats?.streak || 0}</p>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Day Streak</p>
            </div>
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 text-center group hover:bg-white/10 transition-all">
                <div className="mx-auto w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 mb-2">
                    <Zap size={20} />
                </div>
                <p className="text-xl font-black text-white">{stats?.xp || 0}</p>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Earned XP</p>
            </div>
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 text-center group hover:bg-white/10 transition-all">
                <div className="mx-auto w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center text-pink-400 mb-2">
                    <Palette size={20} />
                </div>
                <p className="text-xl font-black text-white">{stats?.badges.length || 0}</p>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Badges</p>
            </div>
        </div>

        {/* Weekly Report Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Score Card */}
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/10 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-white/10 transition-all duration-500 min-h-[300px]">
                {report ? (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <h3 className="text-gray-400 uppercase text-xs font-bold tracking-[0.2em] mb-6 z-10">Focus Score</h3>
                        <div className="relative w-40 h-40 flex items-center justify-center z-10">
                            <svg className="w-full h-full transform -rotate-90 drop-shadow-lg">
                                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="none" className="text-gray-700/50" />
                                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="none"
                                    className={`text-purple-500 transition-all duration-1000 ease-out`}
                                    strokeDasharray={440}
                                    strokeDashoffset={440 - (440 * (report.score || 0)) / 100}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute flex flex-col items-center">
                                <span className="text-4xl font-black text-white tracking-tighter">
                                    {typeof report.score === 'number' ? report.score.toFixed(2) : report.score}
                                </span>
                                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mt-1">Efficiency</span>
                            </div>
                        </div>
                        <p className="mt-6 text-center text-xs font-bold text-gray-300 z-10 bg-white/5 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10 uppercase tracking-widest">
                            {report.score > 80 ? "✨ Peak Performance" : report.score > 50 ? "🌱 Growth Detected" : "⚡ Ready to Sprint"}
                        </p>
                    </>
                ) : (
                    <div className="text-center">
                        <Activity size={48} className="text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 font-bold">Waiting for Data</p>
                        <p className="text-[10px] text-gray-600 uppercase mt-1">Complete sessions to unlock</p>
                    </div>
                )}
            </div>

            {/* Stat Cards */}
            <div className="grid grid-rows-2 gap-6">
                <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 hover:bg-white/10 transition-all group">
                    <div className="flex items-center justify-between mb-2">
                        <Zap className="text-blue-400" size={20} />
                        <span className="text-[10px] font-bold text-blue-300/50 uppercase tracking-wider">Output</span>
                    </div>
                    <p className="text-3xl font-black text-white">{report?.totalProductiveMins || 0}</p>
                    <p className="text-xs text-gray-400 font-medium">Productive Minutes</p>
                </div>
                <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 hover:bg-white/10 transition-all group">
                    <div className="flex items-center justify-between mb-2">
                        <Activity className="text-orange-400" size={20} />
                        <span className="text-[10px] font-bold text-orange-300/50 uppercase tracking-wider">Volume</span>
                    </div>
                    <p className="text-3xl font-black text-white">{report?.totalSessions || 0}</p>
                    <p className="text-xs text-gray-400 font-medium">Deep Work Sessions</p>
                </div>
            </div>

            {/* Mastery Radar Section */}
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                    <Target className="text-pink-400" size={18} />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Mastery Map</h3>
                </div>
                <div className="flex-1 w-full min-h-[200px]">
                    {subjectData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={subjectData}>
                                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                                <Radar
                                    name="Mastery"
                                    dataKey="minutes"
                                    stroke="#ec4899"
                                    fill="#ec4899"
                                    fillOpacity={0.6}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4">
                            <p className="text-xs text-gray-500 italic">Complete sessions globally to populate your skill radar.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                {/* Chart Section */}
                <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/10 min-h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-white">Activity Momentum</h3>
                        <div className="flex gap-2">
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/20 rounded-full border border-purple-500/30">
                                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                                <span className="text-[10px] font-bold text-purple-300 uppercase">Live Velocity</span>
                            </div>
                        </div>
                    </div>
                    {dailyData.length > 0 ? (
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dailyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                                    />
                                    <Bar dataKey="minutes" fill="#a855f7" radius={[6, 6, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-64 flex items-center justify-center border border-dashed border-white/10 rounded-2xl">
                            <p className="text-gray-500 text-sm">Not enough data to generate velocity tracks.</p>
                        </div>
                    )}
                </div>

                {/* Badge Gallery */}
                <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/10">
                    <h3 className="text-xl font-bold text-white mb-6">Achievement Gallery</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                        {stats?.badges.length && stats.badges.length > 0 ? stats.badges.map(badge => (
                            <div key={badge.id} className="group relative flex flex-col items-center p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
                                <img src={badge.iconUrl} alt={badge.name} className="w-16 h-16 object-contain mb-3 drop-shadow-lg group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-black uppercase text-purple-400 mb-1">{badge.category}</span>
                                <span className="text-xs font-bold text-white text-center">{badge.name}</span>
                                
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-48 p-3 bg-black/90 backdrop-blur-xl rounded-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-2xl">
                                    <p className="text-xs text-white font-medium">{badge.description}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="col-span-full py-12 text-center">
                                <p className="text-gray-500 font-medium">No badges earned yet. Complete quizzes to earn your first one!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Theme Shop Sidebar */}
            <div className="space-y-6">
                <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/10">
                    <div className="flex items-center gap-3 mb-6">
                        <Palette className="text-purple-400" size={20} />
                        <h3 className="text-lg font-bold text-white">Theme Shop</h3>
                    </div>
                    
                    <div className="space-y-4">
                        {themes.map(theme => (
                            <div 
                                key={theme.id}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                                    stats?.activeThemeId === theme.id 
                                        ? 'bg-purple-500/20 border-purple-500 shadow-lg shadow-purple-500/10' 
                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                }`}
                                onClick={() => theme.isUnlocked ? setActiveTheme(theme.id) : null}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="text-sm font-bold text-white">{theme.name}</p>
                                        <div className="flex gap-1 mt-1">
                                            {Object.values(theme.cssConfig).slice(0, 4).map((color: any, i) => (
                                                <div key={i} className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: color }}></div>
                                            ))}
                                        </div>
                                    </div>
                                    {theme.isUnlocked ? (
                                        stats?.activeThemeId === theme.id ? <Check size={16} className="text-purple-400" /> : null
                                    ) : (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); unlockTheme(theme.id); }}
                                            className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-[10px] font-black uppercase text-white transition-colors"
                                        >
                                            <Lock size={10} /> {theme.xpCost} XP
                                        </button>
                                    )}
                                </div>
                                {theme.isUnlocked && stats?.activeThemeId !== theme.id && (
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tap to apply</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                        <Trophy size={60} />
                    </div>
                    <h4 className="font-bold mb-2 flex items-center gap-2">
                        <Zap size={16} className="text-yellow-400" />
                        Seasonal Competition
                    </h4>
                    <p className="text-xs text-indigo-100 mb-4 opacity-80 leading-relaxed">
                        Join the March "Spring Sprint" to earn the exclusive Botanical badge and 2000 XP bonus!
                    </p>
                    
                    {stats?.challenges.find(c => c.challengeId === 'spring-sprint-2026') ? (
                        <div className="space-y-3">
                            <div className="flex justify-between items-end">
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Current Progress</span>
                                <span className="text-xs font-bold">
                                    {stats.challenges.find(c => c.challengeId === 'spring-sprint-2026')?.progress || 0}/5 Courses
                                </span>
                            </div>
                            <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-white transition-all duration-1000" 
                                    style={{ width: `${((stats.challenges.find(c => c.challengeId === 'spring-sprint-2026')?.progress || 0) / 5) * 100}%` }}
                                ></div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl border border-white/5">
                                <Check size={12} className="text-green-400" />
                                <span className="text-[10px] font-bold uppercase">Officially Enrolled</span>
                            </div>
                        </div>
                    ) : (
                        <button 
                            disabled={joining}
                            onClick={async () => {
                                try {
                                    setJoining(true);
                                    await joinChallenge('spring-sprint-2026');
                                    alert('Successfully joined the Spring Sprint!');
                                } catch (err: any) {
                                    alert('Failed to join challenge: ' + (err.response?.data?.error || err.message));
                                } finally {
                                    setJoining(false);
                                }
                            }}
                            className="w-full py-2.5 bg-white text-indigo-600 hover:bg-indigo-50 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {joining ? 'Joining...' : <><Trophy size={14} /> Join Sprint</>}
                        </button>
                    )}
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}

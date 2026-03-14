
import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, RefreshCw, BarChart, Layers, ListTodo } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

interface Content {
    id: string;
    title: string;
    type: string;
    duration: number;
    thumbnail?: string;
    url?: string;
}

interface StudySession {
    id: string;
    dayOffset: number;
    dayNumber: number;
    date: string;
    topic: string; // Sub-topic
    sessionTime?: string;
    isPractice: boolean;
    isCompleted: boolean;
    content?: Content;
}

interface StudyPlan {
    id: string;
    topic: string;
    difficulty: string;
    startDate: string;
    endDate: string;
    dailyMinutes: number;
    sessions: StudySession[];
}

export default function Schedule() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [plan, setPlan] = useState<StudyPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const [formData, setFormData] = useState({
        topic: '',
        difficulty: 'Beginner',
        endDate: new Date(new Date().setDate(new Date().getDate() + 28)).toISOString().split('T')[0], // Default 4 weeks
        startDate: new Date().toISOString().split('T')[0]
    });
    const [pollHydration, setPollHydration] = useState(false);

    useEffect(() => {
        fetchPlan();
    }, []);

    const fetchPlan = async () => {
        try {
            const res = await client.get('/api/schedule');
            if (res.data && res.data.id) {
                setPlan(res.data);
            } else if (res.status === 200) {
                setPlan(null);
            }
        } catch (error: any) {
            console.error('Failed to fetch plan', error);
            // Don't clear plan on 429 or network error - keep old data
            if (error.response?.status === 404) {
               setPlan(null);
            }
        } finally {
            setLoading(false);
        }
    };

    // Robust Polling for Hydration
    useEffect(() => {
        if (!pollHydration || !plan) return;

        const needsHydration = plan.sessions.some(s => !s.isPractice && !s.content);
        if (!needsHydration) {
            setPollHydration(false);
            return;
        }

        // Start with 5s, increase to 15s after 30s
        let currentInterval = 5000;
        let timer: ReturnType<typeof setInterval>;

        const runPoll = () => {
            fetchPlan();
        };

        timer = setInterval(runPoll, currentInterval);

        const upgradeTimeout = setTimeout(() => {
            clearInterval(timer);
            currentInterval = 15000;
            timer = setInterval(runPoll, currentInterval);
        }, 30000);

        // Stop polling after 3 minutes to save resources
        const stopTimeout = setTimeout(() => {
            clearInterval(timer);
            clearTimeout(upgradeTimeout);
            setPollHydration(false);
        }, 180000);

        return () => {
            clearInterval(timer);
            clearTimeout(upgradeTimeout);
            clearTimeout(stopTimeout);
        };
    }, [pollHydration, plan]);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setGenerating(true);
        try {
            const res = await client.post('/api/schedule/generate', {
                topic: formData.topic,
                difficulty: formData.difficulty,
                endDate: formData.endDate,
                startDate: formData.startDate
            });
            setPlan(res.data);
            // Start polling if needed
            setPollHydration(true);
        } catch (error) {
            console.error('Failed to generate plan', error);
            alert('Failed to generate plan. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    const handleStartSession = (contentId?: string, sessionId?: string) => {
        if (contentId) {
            const url = sessionId
                ? `/session/${contentId}?studySessionId=${sessionId}`
                : `/session/${contentId}`;
            navigate(url);
        } else {
            alert("No content available for this session yet. Please wait for the system to find resources.");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading study plan...</div>;

    // Helper to calculate days remaining
    const getDaysRemaining = (endDate: string) => {
        const diff = new Date(endDate).getTime() - new Date().getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    const getTotalDuration = (sessions: StudySession[]) => {
        const totalSeconds = sessions.reduce((acc, s) => acc + (s.content?.duration || 0), 0);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    };

    return (
        <div className="min-h-screen pb-20">
            {/* Sticky Nav Header */}
            <header className="sticky top-0 z-50 bg-white/10 backdrop-blur-md border-b border-white/10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300">MindSphere</h1>
                        <p className="text-sm text-gray-300">Welcome back, {user?.name}</p>
                    </div>
                    <div className="flex gap-4 items-center">
                        <Link to="/" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Home</Link>
                        <Link to="/survey" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Preferences</Link>
                        <Link to="/analytics" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Insights</Link>
                        {user?.role === 'ADMIN' && (
                            <Link to="/admin" className="text-sm font-medium text-red-400 hover:text-red-300 transition-colors">Moderation</Link>
                        )}
                        <button onClick={logout} className="text-sm font-medium text-gray-400 hover:text-white border-l border-white/20 pl-4 ml-2 transition-colors">
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 pt-8">
                <header className="mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Your Study Plan</h1>
                        <p className="text-gray-400 mt-2">Structured learning path for <span className="text-purple-400">{user?.email}</span></p>
                    </div>
                    {plan && (
                         <div className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">
                            Plan ID: {plan.id}
                         </div>
                    )}
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Configuration Panel */}
                    <div className="lg:col-span-1">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl p-6 sticky top-24 border border-white/20">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <RefreshCw size={20} className="text-purple-400" />
                                New Plan
                            </h2>

                            <form onSubmit={handleGenerate} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Topic</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.topic}
                                        onChange={e => setFormData({ ...formData, topic: e.target.value })}
                                        placeholder="e.g. React Native"
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Difficulty</label>
                                    <select
                                        value={formData.difficulty}
                                        onChange={e => setFormData({ ...formData, difficulty: e.target.value })}
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 [&>option]:bg-gray-800"
                                    >
                                        <option value="Beginner">Beginner</option>
                                        <option value="Intermediate">Intermediate</option>
                                        <option value="Advanced">Advanced</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 color-scheme-dark"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 color-scheme-dark"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={generating}
                                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 shadow-lg"
                                >
                                    {generating ? 'Generating...' : 'Generate Plan'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Plan View */}
                    <div className="lg:col-span-3 space-y-6">
                        {!plan ? (
                            <div className="bg-white/5 backdrop-blur-md rounded-2xl shadow-xl p-12 text-center h-full flex flex-col justify-center items-center border border-white/10">
                                <Layers className="w-16 h-16 text-gray-400 mb-4" />
                                <h3 className="text-xl font-medium text-white mb-2">No Active Study Plan</h3>
                                <p className="text-gray-400 max-w-md mx-auto">
                                    Create a new study plan to get a structured curriculum with daily content recommendations.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Plan Header */}
                                <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl p-6 border-l-4 border-purple-500 border-y border-r border-white/10">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">{plan.topic}</h2>
                                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-300">
                                                <span className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded border border-white/10"><BarChart size={16} className="text-purple-400" /> {plan.difficulty}</span>
                                                <span className="flex items-center gap-1.5 bg-purple-500/20 text-purple-200 px-2 py-1 rounded font-medium border border-purple-500/30"><Calendar size={16} /> Ends on {new Date(plan.endDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                                <span className="flex items-center gap-1.5 text-gray-400"><Clock size={16} /> {getDaysRemaining(plan.endDate)} days remaining</span>
                                                <span className="flex items-center gap-1.5 text-purple-300 font-medium bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20"><Layers size={16} /> Total: {getTotalDuration(plan.sessions)}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-bold text-purple-400 leading-none">{Math.round((plan.sessions.filter(s => s.isCompleted).length / plan.sessions.length) * 100) || 0}%</div>
                                            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Progress</div>
                                            
                                            <button 
                                                onClick={() => navigate(`/plan/${plan.id}/tasks`)}
                                                className="mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg w-full"
                                            >
                                                <ListTodo size={16} />
                                                View Tasks
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Sessions List */}
                                <div className="space-y-8">
                                    {Object.entries(
                                        plan.sessions.reduce((acc, session) => {
                                            const day = session.dayNumber || (session.dayOffset + 1);
                                            if (!acc[day]) acc[day] = [];
                                            acc[day].push(session);
                                            return acc;
                                        }, {} as Record<number, StudySession[]>)
                                    ).sort(([a], [b]) => Number(a) - Number(b)).map(([day, daySessions]) => (
                                        <div key={day} className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-white/10">
                                            <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-purple-600/20 text-purple-400 w-12 h-12 rounded-xl flex flex-col items-center justify-center border border-purple-500/20">
                                                        <span className="text-xs uppercase font-bold leading-none">Day</span>
                                                        <span className="text-lg font-bold leading-none">{day}</span>
                                                    </div>
                                                    <div>
                                                        <div className="text-white font-bold">{new Date(daySessions[0].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                                        <div className="text-xs text-gray-400 italic">{new Date(daySessions[0].date).toLocaleDateString(undefined, { weekday: 'long' })}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="divide-y divide-white/10">
                                                {daySessions.sort((a, b) => (a.sessionTime || "").localeCompare(b.sessionTime || "")).map((session) => (
                                                    <div key={session.id} className="p-6 hover:bg-white/5 transition-colors group">
                                                        <div className="flex flex-col md:flex-row gap-6">
                                                            {/* Time slot */}
                                                            <div className="flex-shrink-0 w-24">
                                                                <div className="flex items-center gap-2 text-purple-400 font-mono font-bold text-lg">
                                                                    <Clock size={16} />
                                                                    {session.sessionTime || "09:00"}
                                                                </div>
                                                            </div>

                                                            {/* Content */}
                                                            <div className="flex-grow">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <h4 className="text-xl font-bold text-white">{session.topic.split('\n\n')[0]}</h4>
                                                                {session.isPractice && (
                                                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border tracking-tight ${
                                                                            session.topic.startsWith('Comprehensive Quiz') ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                                                            session.topic.startsWith('Milestone Project') ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                                                            'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                                                        }`}>
                                                                            {session.topic.startsWith('Comprehensive Quiz') ? 'Quiz' :
                                                                             session.topic.startsWith('Milestone Project') ? 'Project' :
                                                                             'Practice'}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {session.isPractice ? (
                                                                    <div className={`border rounded-xl p-4 ${
                                                                        session.topic.startsWith('Comprehensive Quiz') ? 'bg-amber-500/5 border-amber-500/10 text-amber-200/80' :
                                                                        session.topic.startsWith('Milestone Project') ? 'bg-blue-500/5 border-blue-500/10 text-blue-200/80' :
                                                                        'bg-emerald-500/5 border-emerald-500/10 text-emerald-200/80'
                                                                    }`}>
                                                                        <h5 className={`text-sm font-bold mb-2 flex items-center gap-2 uppercase tracking-wide ${
                                                                            session.topic.startsWith('Comprehensive Quiz') ? 'text-amber-400' :
                                                                            session.topic.startsWith('Milestone Project') ? 'text-blue-400' :
                                                                            'text-emerald-400'
                                                                        }`}>
                                                                            <Layers size={14} /> 
                                                                            {session.topic.startsWith('Comprehensive Quiz') ? 'Comprehensive Review Quiz' :
                                                                             session.topic.startsWith('Milestone Project') ? 'Milestone Project' :
                                                                             'Practice Exercises'}
                                                                        </h5>
                                                                        <p className="whitespace-pre-wrap text-sm leading-relaxed italic">
                                                                            {session.topic.includes('\n\n') ? session.topic.split('\n\n').slice(1).join('\n\n') : 
                                                                             session.topic.includes(': ') ? session.topic.split(': ')[1] : 
                                                                             session.topic}
                                                                        </p>
                                                                        <button 
                                                                            onClick={() => handleStartSession(session.content?.id, session.id)}
                                                                            className={`mt-4 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg ${
                                                                                session.topic.startsWith('Comprehensive Quiz') ? 'bg-amber-600 hover:bg-amber-700 text-white' :
                                                                                session.topic.startsWith('Milestone Project') ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                                                                                'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                                            }`}
                                                                        >
                                                                            {session.topic.startsWith('Comprehensive Quiz') ? 'Start Quiz' :
                                                                             session.topic.startsWith('Milestone Project') ? 'Start Project' :
                                                                             'Complete Practice'}
                                                                        </button>
                                                                    </div>
                                                                ) : session.content ? (
                                                                    <div className="bg-black/20 border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center shadow-sm group-hover:border-purple-500/30 transition-colors">
                                                                        {session.content.thumbnail && (
                                                                            <img src={session.content.thumbnail} alt="" className="w-32 h-20 object-cover rounded-lg bg-gray-800 shadow-md" />
                                                                        )}
                                                                        <div className="flex-grow">
                                                                            <h5 className="font-bold text-gray-100 text-lg leading-snug mb-1">{session.content.title}</h5>
                                                                            <div className="flex items-center gap-3 text-xs text-gray-400">
                                                                                <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded-md font-bold border border-red-500/20 flex items-center gap-1">
                                                                                    <BarChart size={12} /> {session.content.type}
                                                                                </span>
                                                                                <span className="flex items-center gap-1">
                                                                                    {session.content.duration >= 3600
                                                                                        ? `${Math.floor(session.content.duration / 3600)}h ${Math.floor((session.content.duration % 3600) / 60)}m`
                                                                                        : `${Math.floor(session.content.duration / 60)}:${(session.content.duration % 60).toString().padStart(2, '0')}`
                                                                                    }
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => handleStartSession(session.content?.id, session.id)}
                                                                            className="w-full sm:w-auto bg-purple-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-purple-700 transition-all shadow-xl hover:scale-105 active:scale-95"
                                                                        >
                                                                            Start
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-4 flex gap-3 items-center text-sm text-yellow-500/80 font-medium">
                                                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-500 border-t-transparent"></div>
                                                                        Curating your personalized content...
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

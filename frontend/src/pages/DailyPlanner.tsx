import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, Layers, CheckCircle2, Circle, ArrowLeft, Coffee, Play, Clock, Video } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

interface DailyTask {
    id: string;
    title: string;
    type: 'STUDY' | 'BREAK' | 'STUDY_PLAN_TASK';
    startTime: string;
    duration: number;
    isCompleted: boolean;
    content?: {
        id: string;
        title: string;
        thumbnail?: string;
        duration?: number;
    };
}

interface DailyPlan {
    id: string;
    topic: string;
    date: string;
    tasks: DailyTask[];
}

export default function DailyPlanner() {
    useAuth();
    const navigate = useNavigate();
    const [plan, setPlan] = useState<DailyPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [topic, setTopic] = useState('');

    useEffect(() => {
        fetchPlan();
    }, []);

    const fetchPlan = async () => {
        try {
            const res = await client.get('/api/daily-plan');
            if (res.data && res.data.id) {
                setPlan(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch daily plan', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setGenerating(true);
        try {
            const res = await client.post('/api/daily-plan/generate', { topic });
            setPlan(res.data);
        } catch (error) {
            console.error('Failed to generate daily plan', error);
            alert('Failed to generate plan. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    const toggleTask = async (taskId: string) => {
        try {
            const res = await client.patch(`/api/daily-plan/tasks/${taskId}/toggle`);
            setPlan(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    tasks: prev.tasks.map(t => t.id === taskId ? res.data : t)
                };
            });
        } catch (error) {
            console.error('Failed to toggle task', error);
        }
    };

    const formatDuration = (seconds: number) => {
        if (seconds >= 3600) {
            const hours = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${mins}m`;
        }
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getTotalDuration = () => {
        if (!plan) return '0m';
        const totalSeconds = plan.tasks.reduce((acc, t) => acc + (t.content?.duration || 0), 0);
        return formatDuration(totalSeconds);
    };

    const calculateProgress = () => {
        if (!plan || plan.tasks.length === 0) return 0;
        const completed = plan.tasks.filter(t => t.isCompleted).length;
        return Math.round((completed / plan.tasks.length) * 100);
    };

    if (loading) return <div className="p-8 text-center text-white">Loading your daily mission...</div>;

    return (
        <div className="min-h-screen pb-20 bg-slate-950 text-white">
            <header className="sticky top-0 z-50 bg-white/5 backdrop-blur-md border-b border-white/10">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                    <Link to="/" className="flex items-center gap-2 group shrink-0">
                        <ArrowLeft size={20} className="text-gray-400 group-hover:text-white transition-colors" />
                        <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300 hidden sm:block">Daily Planner</h1>
                    </Link>

                    <div className="flex-grow max-w-xl">
                        <form onSubmit={handleGenerate} className="flex gap-2">
                            <input 
                                type="text"
                                required
                                autoComplete="off"
                                autoCorrect="off"
                                spellCheck={false}
                                value={topic}
                                onChange={e => setTopic(e.target.value)}
                                placeholder="What's your mission today?"
                                className="flex-grow px-4 py-1.5 bg-white/5 border border-white/10 rounded-xl focus:ring-1 focus:ring-purple-500 text-sm outline-none transition-all"
                            />
                            <button 
                                type="submit"
                                disabled={generating}
                                className="whitespace-nowrap px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-purple-600/20"
                            >
                                {generating ? <RefreshCw className="animate-spin" size={14} /> : <Layers size={14} />}
                                <span className="hidden lg:inline">Plan My Whole Day</span>
                            </button>
                        </form>
                    </div>

                    <div className="flex items-center text-xs font-medium text-gray-500 shrink-0">
                        <span className="hidden md:inline">{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 pt-12">
                {!plan ? (
                    <div className="py-20 text-center">
                        <Layers className="w-16 h-16 text-purple-400 mx-auto mb-6 opacity-20" />
                        <h2 className="text-2xl font-bold mb-2 text-gray-300">No active mission</h2>
                        <p className="text-gray-500">Use the bar above to plan your day</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl p-6 border-l-4 border-purple-500 border-y border-r border-white/10 mb-8">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-3xl font-bold text-white">{plan.topic}</h2>
                                    <p className="text-purple-400 font-medium mt-1">Today's Personalized Mission</p>
                                    <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-400">
                                        <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded border border-white/10">
                                            <CheckCircle2 size={14} className="text-emerald-400" />
                                            {plan.tasks.filter(t => t.isCompleted).length} / {plan.tasks.length} Tasks
                                        </span>
                                        <span className="flex items-center gap-1.5 text-indigo-300 font-medium bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">
                                            <Video size={14} />
                                            {plan.tasks.filter(t => t.content).length} videos attached
                                        </span>
                                        <span className="flex items-center gap-1.5 text-gray-400 bg-white/5 px-2 py-1 rounded border border-white/10">
                                            <Clock size={14} />
                                            {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </span>
                                        <span className="flex items-center gap-1.5 text-purple-300 font-medium bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">
                                            <Layers size={14} />
                                            Total: {getTotalDuration()}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <div className="text-3xl font-bold text-purple-400 leading-none">{calculateProgress()}%</div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wide mt-1 mb-2">Progress</div>
                                    
                                    {/* Visual Progress Bar */}
                                    <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
                                        <div 
                                            className="h-full bg-gradient-to-r from-purple-600 to-pink-500 transition-all duration-500 ease-out"
                                            style={{ width: `${calculateProgress()}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            {/* Vertical Line */}
                            <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-purple-500/50 via-indigo-500/20 to-transparent"></div>

                            <div className="space-y-6">
                                {plan.tasks.map((task) => (
                                    <div key={task.id} className="relative pl-16 group">
                                        {/* Timeline Dot */}
                                        <div className={`absolute left-0 w-14 h-14 rounded-full border-4 border-slate-950 flex items-center justify-center z-10 transition-all ${
                                            task.isCompleted ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 
                                            task.type === 'BREAK' ? 'bg-orange-500/20 border-orange-500/40 text-orange-400' :
                                            'bg-purple-600 border-purple-500/50 text-white'
                                        }`}>
                                            {task.isCompleted ? <CheckCircle2 size={24} /> : 
                                             task.type === 'BREAK' ? <Coffee size={24} /> : 
                                             <span className="text-xs font-bold">{task.startTime}</span>}
                                        </div>

                                        <div className={`p-6 rounded-3xl border transition-all ${
                                            task.isCompleted ? 'bg-emerald-500/5 border-emerald-500/10 opacity-70' :
                                            task.type === 'BREAK' ? 'bg-orange-500/5 border-orange-500/10' :
                                            'bg-white/5 border-white/10 hover:border-purple-500/30'
                                        }`}>
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">{task.startTime} • {task.duration}m</span>
                                                        {task.type === 'STUDY_PLAN_TASK' && (
                                                            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full uppercase font-bold tracking-tighter">Plan Task</span>
                                                        )}
                                                    </div>
                                                    <h3 className={`text-xl font-bold ${task.isCompleted ? 'line-through text-gray-500' : ''}`}>
                                                        {task.title}
                                                    </h3>
                                                </div>
                                                <button 
                                                    onClick={() => toggleTask(task.id)}
                                                    className={`p-2 rounded-xl transition-all ${
                                                        task.isCompleted ? 'text-emerald-400 hover:bg-emerald-400/10' : 'text-gray-600 hover:text-white hover:bg-white/10'
                                                    }`}
                                                >
                                                    {task.isCompleted ? <CheckCircle2 size={28} /> : <Circle size={28} />}
                                                </button>
                                            </div>

                                            {task.content && !task.isCompleted && (
                                                <div className="bg-black/40 rounded-2xl overflow-hidden flex flex-col sm:flex-row border border-white/5 hover:border-purple-500/40 transition-all cursor-pointer group/content" 
                                                     onClick={() => navigate(`/session/${task.content?.id}?source=daily-planner&dailyTaskId=${task.id}`)}>
                                                    {task.content.thumbnail && (
                                                        <div className="relative w-full sm:w-48 h-28 shrink-0">
                                                            <img src={task.content.thumbnail} alt="" className="w-full h-full object-cover" />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/content:opacity-100 flex items-center justify-center transition-opacity">
                                                                <Play size={32} fill="white" />
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="p-4 flex flex-col justify-center">
                                                        <h4 className="font-bold text-gray-200 group-hover/content:text-white transition-colors">{task.content.title}</h4>
                                                        <div className="flex items-center gap-4 mt-2">
                                                            <p className="text-xs text-purple-400 font-bold flex items-center gap-1 uppercase tracking-tighter">
                                                                <Play size={12} fill="currentColor" /> Watch Video Session
                                                            </p>
                                                            {task.content.duration && (
                                                                <span className="text-[10px] text-gray-500 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                                                    {formatDuration(task.content.duration)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {!task.content && task.type === 'STUDY' && !task.isCompleted && (
                                                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 bg-white/3 border border-white/5 rounded-xl px-4 py-2.5">
                                                    <Video size={13} className="text-gray-600 shrink-0" />
                                                    <span>No video found for this topic — try a hands-on practice session instead.</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

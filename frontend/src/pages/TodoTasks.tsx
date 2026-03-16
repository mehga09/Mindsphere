import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, ArrowLeft } from 'lucide-react';
import client from '../api/client';

export interface LearningTask {
    id: string;
    planId: string;
    title: string;
    isCompleted: boolean;
    createdAt: string;
    sessions?: { sessionTime: string; dayNumber: number }[];
}

export default function TodoTasks() {
    const { planId } = useParams<{ planId: string }>();
    const navigate = useNavigate();
    const [tasks, setTasks] = useState<LearningTask[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTasks = async () => {
        try {
            if (!planId) return;
            const res = await client.get(`/api/tasks/${planId}`);
            if (Array.isArray(res.data)) {
                setTasks(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch tasks', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
        // Optional polling for auto-completed tasks
        const interval = setInterval(fetchTasks, 10000);
        return () => clearInterval(interval);
    }, [planId]);

    const toggleTask = async (taskId: string) => {
        // Optimistic update
        setTasks(current => 
            current.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t)
        );
        try {
            await client.patch(`/api/tasks/${taskId}/complete`);
        } catch (error) {
            console.error('Failed to toggle task completion', error);
            // Revert on failure
            fetchTasks();
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen pt-8 flex justify-center text-white">
                Loading tasks...
            </div>
        );
    }

    if (tasks.length === 0) {
        return (
            <div className="min-h-screen pt-8 flex flex-col items-center text-white">
                <p>No tasks found for this plan.</p>
                <button onClick={() => navigate(-1)} className="mt-4 text-purple-400 hover:text-purple-300">
                    Go Back
                </button>
            </div>
        );
    }

    const completedCount = tasks.filter(t => t.isCompleted).length;
    const totalTasks = tasks.length;
    const progressPercent = Math.round((completedCount / totalTasks) * 100) || 0;

    return (
        <div className="min-h-screen pb-20 pt-8">
            <div className="max-w-4xl mx-auto px-4">
                <button 
                    onClick={() => navigate('/schedule')} 
                    className="flex items-center gap-2 mb-6 text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={20} />
                    Back to Schedule
                </button>

                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Study Plan Tasks</h1>
                    <p className="text-gray-400">Track your learning milestones</p>
                </header>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-white/10">
                    <div className="px-6 py-5 border-b border-white/10 bg-white/5">
                        <h2 className="text-xl font-semibold text-white mb-4">Progress</h2>
                        
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-sm font-medium text-gray-300">
                                {completedCount} / {totalTasks} tasks completed
                            </span>
                            <span className="text-2xl font-bold text-purple-400">
                                {progressPercent}%
                            </span>
                        </div>
                        
                        <div className="w-full bg-gray-700/50 rounded-full h-3 overflow-hidden">
                            <div 
                                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-3 rounded-full transition-all duration-500 ease-out" 
                                style={{ width: `${progressPercent}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="px-6 py-4 border-b border-white/10 bg-white/5">
                        <h3 className="font-semibold text-white">Tasks</h3>
                    </div>

                    <div className="divide-y divide-white/5 py-2">
                        {tasks.map(task => (
                            <div 
                                key={task.id} 
                                className="px-6 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer group"
                                onClick={() => toggleTask(task.id)}
                            >
                                <button className="flex-shrink-0 text-gray-400 focus:outline-none group-hover:text-purple-400 transition-colors">
                                    {task.isCompleted ? (
                                        <CheckCircle2 className="w-6 h-6 text-purple-500" />
                                    ) : (
                                        <Circle className="w-6 h-6" />
                                    )}
                                </button>
                                <span className={`text-lg flex-grow transition-all ${
                                    task.isCompleted ? 'text-gray-500 line-through' : 'text-gray-200'
                                }`}>
                                    {task.title}
                                    {task.sessions?.[0]?.sessionTime && (
                                        <span className="ml-3 text-xs font-mono text-purple-400/80 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/10">
                                            {task.sessions[0].sessionTime}
                                        </span>
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

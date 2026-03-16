import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, Layers, CheckCircle2, Circle, ArrowLeft, ArrowRight, Coffee, Play, Clock, Video, Trophy, Pause, Unlock, ExternalLink, Trash2 } from 'lucide-react';
import { useNavigate, Link, useLocation } from 'react-router-dom';

interface TopicNode {
    id: string;
    topicName: string;
    orderIndex: number;
    isMastered: boolean;
    isUnlocked: boolean;
}

interface DailyPerformance {
    id: string;
    dayNumber: number;
    completionRate: number;
    avgQuizScore: number;
    tasksTotal: number;
    tasksCompleted: number;
    recordedAt?: string;
    topicNodeId?: string;
}

interface CoursePlan {
    id: string;
    topic: string;
    dayNumber: number;
    status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
    topicNodes: TopicNode[];
    performance: DailyPerformance[];
    _count?: {
        topicNodes: number;
    };
}

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
    const [activeCourse, setActiveCourse] = useState<CoursePlan | null>(null);
    const [courses, setCourses] = useState<CoursePlan[]>([]);
    const [todayPlan, setTodayPlan] = useState<DailyPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [topic, setTopic] = useState('');
    
    const location = useLocation();
    // View Management: 'PLAN' | 'SUMMARY' | 'COURSES' | 'CREATE'
    const [viewMode, setViewMode] = useState<'PLAN' | 'SUMMARY' | 'COURSES' | 'CREATE'>('PLAN');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('view') === 'courses') {
            setViewMode('COURSES');
            // Clear parameter from address bar so refresh works correctly
            navigate('/daily-planner', { replace: true });
        }
    }, [location]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchActiveCourse(),
                fetchCourseList()
            ]);
        } catch (error) {
            console.error('Failed to fetch initial data', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchActiveCourse = async () => {
        try {
            const res = await client.get('/api/course/active');
            if (res.data && res.data.id) {
                setActiveCourse(res.data);
                fetchTodayPlan();
            } else {
                setActiveCourse(null);
                setTodayPlan(null);
            }
        } catch (error) {
            console.error('Failed to fetch active course', error);
        }
    };

    const fetchCourseList = async () => {
        try {
            const res = await client.get('/api/course/all');
            setCourses(res.data);
        } catch (error) {
            console.error('Failed to fetch courses', error);
        }
    };

    const fetchTodayPlan = async () => {
        try {
            const res = await client.get('/api/course/today');
            if (res.data && res.data.id) {
                setTodayPlan(res.data);
            } else {
                setTodayPlan(null);
            }
        } catch (error) {
            console.error('Failed to fetch today plan', error);
        }
    };

    const handleStartCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        setGenerating(true);
        try {
            const res = await client.post('/api/course/start', { topic });
            setActiveCourse(res.data);
            setTopic('');
            fetchTodayPlan();
            setViewMode('PLAN');
            fetchCourseList(); // Refresh list
        } catch (error) {
            console.error('Failed to start course', error);
            alert('Failed to start course. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    const handleRecordPerformance = async () => {
        if (!activeCourse) return;
        try {
            const res = await client.post('/api/course/performance', { courseId: activeCourse.id });
            setActiveCourse(res.data);
            setViewMode('SUMMARY');
        } catch (error) {
            console.error('Failed to record performance', error);
            alert('Failed to record summary. Ensure you have viewed plan tasks.');
        }
    };

    const toggleTask = async (taskId: string) => {
        try {
            const res = await client.patch(`/api/course/tasks/${taskId}/toggle`);
            setTodayPlan(prev => {
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

    const handleDeleteCourse = async (courseId: string) => {
        if (!window.confirm("Are you sure you want to delete this course? All progress will be lost.")) return;
        try {
            await client.delete(`/api/course/${courseId}`);
            if (activeCourse?.id === courseId) {
                setActiveCourse(null);
            }
            fetchCourseList();
        } catch (error) {
            console.error('Failed to delete course', error);
            alert('Failed to delete course.');
        }
    };

    const handleResumeCourse = async (courseId: string) => {
        try {
            const res = await client.patch(`/api/course/${courseId}/resume`);
            setActiveCourse(res.data);
            fetchTodayPlan();
            setViewMode('PLAN');
        } catch (error) {
            console.error('Failed to resume course', error);
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
        if (!todayPlan) return '0m';
        const totalMinutes = todayPlan.tasks.reduce((acc, t) => acc + t.duration, 0);
        return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
    };

    const calculateProgress = () => {
        if (!todayPlan || todayPlan.tasks.length === 0) return 0;
        const studyTasks = todayPlan.tasks.filter(t => t.type === 'STUDY');
        if (studyTasks.length === 0) return 100;
        const completed = studyTasks.filter(t => t.isCompleted).length;
        return Math.round((completed / studyTasks.length) * 100);
    };

    if (loading) return <div className="p-8 text-center text-white">Loading your learning roadmap...</div>;

    // ==========================================
    // 1. ONBOARDING / EMPTY VIEW
    // ==========================================
    const renderOnboarding = () => (
        <div className="py-20 text-center max-w-xl mx-auto px-4">
            <Trophy className="w-16 h-16 text-purple-400 mx-auto mb-6 opacity-40" />
            <h2 className="text-3xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300">Start Your Learning Journey</h2>
            <p className="text-gray-400 mb-8">What topic do you want to master? Specify a course name to build your adaptive curriculum.</p>
            <form onSubmit={handleStartCourse} className="flex gap-3 bg-white/5 p-2 rounded-2xl border border-white/10 shadow-lg">
                <input 
                    type="text"
                    required
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder="e.g. Web Development, Python, nodejs"
                    className="flex-grow px-4 py-3 bg-transparent text-white outline-none text-base"
                />
                <button 
                    type="submit"
                    disabled={generating}
                    className="whitespace-nowrap px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center gap-2"
                >
                    {generating ? <RefreshCw className="animate-spin" size={16} /> : <Unlock size={16} />}
                    Start Course
                </button>
            </form>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
                {['React Native', 'Data Structures', 'Python Backend'].map(preset => (
                    <button key={preset} onClick={() => { setTopic(preset); }} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-gray-400 hover:bg-white/10 hover:text-white transition-all">
                        + {preset}
                    </button>
                ))}
            </div>
            {courses.length > 0 && (
                <button onClick={() => setViewMode('COURSES')} className="mt-6 text-xs text-gray-400 hover:text-white hover:underline transition-all">
                    View Existing Courses
                </button>
            )}
        </div>
    );

    // ==========================================
    // 2. COURSE LIST VIEW
    // ==========================================
    const renderCourseList = () => (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <div className="flex justify-between items-center mb-8">
                <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft size={18} /> Back to Home
                </button>
                <h2 className="text-2xl font-bold">My Courses</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {courses.map(course => (
                    <div key={course.id} className={`p-6 rounded-2xl border backdrop-blur-md transition-all ${
                        course.status === 'ACTIVE' ? 'bg-purple-600/10 border-purple-500/30' : 'bg-white/5 border-white/10'
                    }`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold">{course.topic}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                        course.status === 'ACTIVE' ? 'bg-purple-500/20 text-purple-300' :
                                        course.status === 'PAUSED' ? 'bg-amber-500/20 text-amber-300' : 'bg-green-500/20 text-green-300'
                                    }`}>
                                        {course.status}
                                    </span>
                                    <span className="text-xs text-gray-400">Day {course.dayNumber}</span>
                                </div>
                            </div>
                                <div className="flex gap-2">
                                    {course.status === 'ACTIVE' && (
                                        <button onClick={() => setViewMode('PLAN')} className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md">
                                            <ArrowRight size={16} />
                                        </button>
                                    )}
                                    {course.status !== 'ACTIVE' && (
                                        <button onClick={() => handleResumeCourse(course.id)} className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md">
                                            <Play size={16} fill="white" />
                                        </button>
                                    )}
                                    <button onClick={() => handleDeleteCourse(course.id)} className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-red-300 transition-all shadow-md">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                            <span>Topics Mastered: {course.topicNodes?.filter((n: any) => n.isMastered).length || 0} / {course.topicNodes?.length || course._count?.topicNodes}</span>
                            <span>{new Date(course.performance[0]?.recordedAt || Date.now()).toLocaleDateString()}</span>
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-8 text-center">
                <button onClick={() => { setActiveCourse(null); setViewMode('CREATE'); }} className="px-6 py-2 border border-dashed border-white/20 rounded-xl text-gray-400 hover:border-white/40 hover:text-white transition-all">
                    + Start a New Topic
                </button>
            </div>
        </div>
    );

    // ==========================================
    // 3. DAY SUMMARY VIEW
    // ==========================================
    // ==========================================
    // 3. DAY SUMMARY VIEW
    // ==========================================
    const renderSummary = () => {
        const perf = activeCourse?.performance[0]; // latest record
        const currentNode = activeCourse?.topicNodes.find((n: any) => n.id === perf?.topicNodeId);
        const nextNode = activeCourse?.topicNodes.find((n: any) => n.orderIndex === ((currentNode?.orderIndex ?? 0) + 1));
        const isNodeMastered = currentNode?.isMastered;

        const handleCompleteCourse = async () => {
            if (!activeCourse) return;
            try {
                await client.patch(`/api/course/${activeCourse.id}/complete`);
                setActiveCourse(null);
                setViewMode('COURSES');
            } catch (error) {
                console.error('Failed to complete course', error);
            }
        };

        return (
            <div className="py-20 text-center max-w-xl mx-auto px-4">
                <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-6 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]" />
                <h2 className="text-3xl font-bold mb-2">Day {activeCourse?.dayNumber ? (activeCourse.dayNumber - 1) : 1} Complete!</h2>
                <p className="text-gray-400 mb-8">Adaptive review finished. Great progress tracking.</p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                        <div className="text-2xl font-bold text-purple-400">{Math.round((perf?.completionRate || 0) * 100)}%</div>
                        <div className="text-xs text-gray-500 uppercase">Task Completion</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                        <div className="text-2xl font-bold text-teal-400">{Math.round((perf?.avgQuizScore || 0) * 100)}%</div>
                        <div className="text-xs text-gray-500 uppercase">Avg Quiz Score</div>
                    </div>
                </div>

                {isNodeMastered && (
                    <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-2xl mb-8">
                        <h4 className="text-lg font-bold text-green-400 mb-1">🎉 {currentNode?.topicName} Mastered!</h4>
                        <p className="text-xs text-gray-400 mb-4">You have successfully cleared all assessment checkpoints for this node.</p>
                        
                        {nextNode ? (
                            <div className="flex flex-col gap-2">
                                <button onClick={() => { fetchTodayPlan(); setViewMode('PLAN'); }} className="w-full px-6 py-2.5 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-sm transition-all shadow-md">
                                    Unlock & Continue to {nextNode.topicName}
                                </button>
                                <button onClick={handleCompleteCourse} className="w-full px-6 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl font-medium text-sm text-gray-400 hover:text-white transition-all">
                                    Complete Course Instead
                                </button>
                            </div>
                        ) : (
                            <button onClick={handleCompleteCourse} className="w-full px-6 py-2.5 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-sm transition-all shadow-md">
                                Finish and Benchmark Course as Completed
                            </button>
                        )}
                    </div>
                )}

                {!isNodeMastered && (
                    <>
                        <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl text-sm text-purple-200 mb-8 flex items-center gap-3 justify-center">
                            <ExternalLink size={16} />
                            <span>Your performance is saved. Adaptive metrics will adjust layout config safely tomorrow.</span>
                        </div>
                        <button onClick={() => { fetchTodayPlan(); setViewMode('PLAN'); }} className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-sm transition-all shadow-md">
                            Return to Timeline
                        </button>
                    </>
                )}
            </div>
        );
    };

    if (viewMode === 'COURSES' || (!activeCourse && courses.length > 0 && viewMode === 'PLAN')) return (
        <div className="min-h-screen pb-20 bg-slate-950 text-white">
            {renderCourseList()}
        </div>
    );

    if (viewMode === 'SUMMARY') return (
        <div className="min-h-screen pb-20 bg-slate-950 text-white flex items-center justify-center">
            {renderSummary()}
        </div>
    );

    if (!activeCourse || viewMode === 'CREATE') return (
        <div className="min-h-screen pb-20 bg-slate-950 text-white flex items-center justify-center">
            {renderOnboarding()}
        </div>
    );

    // ==========================================
    // 4. TODAY'S PLAN LAYOUT
    // ==========================================
    return (
        <div className="min-h-screen pb-20 bg-slate-950 text-white flex flex-col md:flex-row">
            {/* Left Panel: Topic Roadmap */}
            <aside className="w-full md:w-80 border-r border-white/5 bg-slate-900/50 backdrop-blur-md flex flex-col pt-6 max-h-screen sticky top-0">
                <div className="px-6 mb-4 flex justify-between items-center">
                    <button onClick={() => setViewMode('COURSES')} className="text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <button onClick={() => setViewMode('COURSES')} className="text-xs bg-white/5 border border-white/10 px-3 py-1 rounded-full text-gray-400 hover:text-white transition-all flex items-center gap-1">
                        <Layers size={12} /> Switch Course
                    </button>
                </div>
                <div className="px-6 mb-6">
                    <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300">{activeCourse.topic}</h1>
                    <p className="text-xs text-gray-500">Day {activeCourse.dayNumber} progression</p>
                </div>

                {/* RoadMap List */}
                <div className="flex-grow overflow-y-auto px-6 space-y-4 pb-10">
                    {activeCourse.topicNodes.map((node) => (
                        <div key={node.id} className={`flex items-start gap-4 p-3 rounded-xl border transition-all ${
                            node.isUnlocked && !node.isMastered ? 'bg-purple-500/10 border-purple-500/30' : 'bg-transparent border-transparent'
                        }`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 ${
                                node.isMastered ? 'bg-emerald-500 border-emerald-400 text-white' :
                                node.isUnlocked ? 'border-purple-500 text-purple-400 animate-pulse' : 'border-white/10 text-gray-600'
                            }`}>
                                {node.isMastered ? <CheckCircle2 size={16} /> : <Circle size={14} />}
                            </div>
                            <div className="flex-grow">
                                <h4 className={`text-sm font-bold ${node.isUnlocked ? 'text-white' : 'text-gray-600'}`}>{node.topicName}</h4>
                                {node.isUnlocked && !node.isMastered && <p className="text-[11px] text-purple-400 font-medium">Currently learning</p>}
                                {node.isMastered && <p className="text-[11px] text-emerald-400">Mastered</p>}
                            </div>
                        </div>
                    ))}
                    {activeCourse.topicNodes.length < 8 && (
                        <div className="flex items-center gap-4 p-3 text-gray-500 border border-transparent">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center opacity-40 shrink-0">
                                <Circle size={14} />
                            </div>
                            <div className="flex-grow">
                                <h4 className="text-sm font-medium italic text-gray-500">... Full-Stack Adaptive Modules</h4>
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content Area: Daily Tasks timeline */}
            <main className="flex-grow px-4 md:px-12 pt-12 max-w-4xl mx-auto">
                {!todayPlan ? (
                    <div className="text-center py-20">
                        <Coffee className="w-16 h-16 text-gray-600 mx-auto mb-4 animate-bounce" />
                        <h2 className="text-xl font-bold">Waiting for adaptive logic...</h2>
                        <p className="text-gray-400 text-sm">Regenerating day schedule for current active node topic.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-start mb-8 bg-white/5 border border-white/10 p-6 rounded-2xl">
                            <div>
                                <h2 className="text-3xl font-bold flex items-center gap-2">
                                    {todayPlan.topic}
                                    <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full font-bold">DAY {activeCourse.dayNumber}</span>
                                </h2>
                                <p className="text-gray-400 text-sm mt-1">Focusing primarily on today's unlocked roadmap focus node.</p>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-purple-400">{calculateProgress()}%</div>
                                <div className="text-xs uppercase text-gray-500 mt-1">Study Completed</div>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="relative">
                            <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-purple-500/50 via-indigo-500/10 to-transparent"></div>
                            
                            <div className="space-y-6">
                                {todayPlan.tasks.map((task) => (
                                    <div key={task.id} className="relative pl-14 group">
                                         <div className={`absolute left-0 w-12 h-12 rounded-full border-4 border-slate-950 flex items-center justify-center z-10 transition-all ${
                                            task.isCompleted ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 
                                            task.type === 'BREAK' ? 'bg-orange-500/20 border-orange-500/40 text-orange-400' :
                                            'bg-purple-600 border-purple-500/50 text-white'
                                        }`}>
                                            {task.isCompleted ? <CheckCircle2 size={20} /> : 
                                             task.type === 'BREAK' ? <Coffee size={20} /> : 
                                             <span className="text-[10px] font-bold">{task.startTime}</span>}
                                        </div>

                                        <div className={`p-5 rounded-2xl border transition-all ${
                                            task.isCompleted ? 'bg-emerald-500/5 border-emerald-500/10 opacity-70' :
                                            task.type === 'BREAK' ? 'bg-orange-500/5 border-orange-500/10' :
                                            'bg-white/5 border-white/10 hover:border-purple-500/20'
                                        }`}>
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <span className="text-[10px] font-mono text-gray-500 uppercase">{task.startTime} • {task.duration}m</span>
                                                    <h3 className={`text-lg font-bold ${task.isCompleted ? 'line-through text-gray-500' : ''}`}>{task.title}</h3>
                                                </div>
                                                {task.type === 'STUDY' ? (
                                                    <div className={`p-1.5 rounded-lg transition-all ${
                                                        task.isCompleted ? 'text-emerald-400' : 'text-gray-500'
                                                    }`}>
                                                        {task.isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                                    </div>
                                                ) : (
                                                    <button onClick={() => toggleTask(task.id)} className={`p-1.5 rounded-lg transition-all ${
                                                        task.isCompleted ? 'text-emerald-400' : 'text-gray-500 hover:text-white'
                                                    }`}>
                                                        {task.isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                                    </button>
                                                )}
                                            </div>

                                            {task.content && !task.isCompleted && (
                                                <div className="bg-black/40 rounded-xl overflow-hidden flex flex-col sm:flex-row border border-white/5 hover:border-purple-500/40 transition-all cursor-pointer group/content" 
                                                     onClick={() => navigate(`/session/${task.content?.id}?dailyTaskId=${task.id}&source=daily-planner`)}>
                                                    {task.content.thumbnail && (
                                                        <img src={task.content.thumbnail} alt="" className="w-full sm:w-40 h-24 object-cover" />
                                                    )}
                                                    <div className="p-4 flex flex-col justify-center">
                                                        <h4 className="font-bold text-gray-200 group-hover/content:text-white text-sm">{task.content.title}</h4>
                                                        <p className="text-[11px] text-purple-400 font-bold mt-2 flex items-center gap-1">
                                                            <Play size={10} fill="currentColor" /> Watch Video
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* End Day Action */}
                        <div className="mt-12 text-center">
                            <button onClick={handleRecordPerformance} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-bold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all">
                                End Day & Save Progress
                            </button>
                            <p className="text-gray-500 text-xs mt-2">Proceeding tells adaptive setup logic tomorrow's nodes sequence benchmarks.</p>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

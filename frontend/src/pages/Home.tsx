import { useEffect, useState } from 'react';
import client from '../api/client';
import { RecommendationCard } from '../components/RecommendationCard';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { subscribeToPush } from '../utils/notifications';
import { 
  PlusCircle, 
  Search, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Play, 
  ArrowRight, 
  Layout, 
  Settings,
  Layers
} from 'lucide-react';

interface Content {
  id: string;
  title: string;
  type: 'VIDEO' | 'ARTICLE' | 'MICRO_MODULE';
  duration: number;
  explanation: string;
  thumbnail?: string;
  url?: string;
  description?: string;
}

export default function Home() {
  const { user, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshProfile();
  }, []);

  useEffect(() => {
    const fetchRecs = async () => {
      try {
        const res = await client.get('/api/content/recommendations');
        if (Array.isArray(res.data)) {
           setRecommendations(res.data);
        }
      } catch (error) {
        console.error('Failed to fetch recommendations', error);
        // Keep old recommendations on transient error
      } finally {
        setLoading(false);
      }
    };
    fetchRecs();
  }, []);

  const handleStartSession = (id: string) => {
    navigate(`/session/${id}`);
  };

  const handleEnableNotifications = async () => {
    // 1. Subscribe to Push (keep existing)
    try {
      await subscribeToPush();
    } catch (e) {
      console.warn("Push subscription skipped or failed", e);
    }

    // 2. Send Email with current recommendations
    // Improved: Use the dedicated endpoint for rich video emails
    if (user?.email) {
      try {
        await client.post('/api/content/recommendations/email');
        alert(`Notifications enabled! We sent your personalized video recommendations to ${user.email}.`);
      } catch (error) {
        console.error('Failed to send email', error);
        alert('Notifications enabled, but failed to send email summary.');
      }
    } else {
      alert('Notifications enabled!');
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading your personalized feed...</div>;
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-50 bg-white/10 backdrop-blur-md border-b border-white/10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300">MindSphere</h1>
            <p className="text-sm text-gray-300">Welcome back, {user?.name}</p>
          </div>
          <div className="flex gap-4 items-center">
            <button onClick={handleEnableNotifications} className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full hover:bg-purple-500/30 transition-colors">
              Enable Notifications
            </button>
            <Link 
              to="/daily-planner" 
              className="group flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded-full text-sm font-bold transition-all shadow-lg shadow-purple-600/20 active:scale-95"
            >
              <Layers size={14} className="group-hover:rotate-12 transition-transform" />
              Plan My Whole Day
            </Link>
            <Link to="/survey" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Preferences</Link>
            <Link to="/schedule" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">My Schedule</Link>
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

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
        <section>
          <div className="flex justify-between items-baseline mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Focus of the Day</h2>
            </div>
            <span className="text-sm text-purple-200 bg-purple-900/40 border border-purple-500/30 px-3 py-1 rounded-full">Anti-Doomscroll Mode</span>
          </div>

          {recommendations.length === 0 ? (
            <div className="text-center p-12 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl shadow-xl">
              <p className="text-lg text-gray-300 mb-4">No recommendations yet.</p>
              <Link to="/survey" className="text-purple-400 hover:text-purple-300 font-medium">Update your interests</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.map(rec => (
                <RecommendationCard key={rec.id} content={rec} onStart={handleStartSession} />
              ))}
            </div>
          )}
        </section>

        {/* Gamification Widget Placeholder */}
        <section className="bg-gradient-to-r from-indigo-600/80 to-purple-600/80 backdrop-blur-md rounded-2xl p-6 text-white shadow-xl border border-white/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/20 rounded-full blur-3xl"></div>
          <div className="flex justify-between items-center relative z-10">
            <div>
              <h3 className="text-lg font-bold">Your Streak</h3>
              <p className="text-3xl font-extrabold mt-1">🔥 {user?.currentStreak || 0} Days</p>
            </div>
            <div>
              <p className="text-white/80 text-sm mb-1">XP Level {user?.level || 1}</p>
              <div className="w-32 h-2 bg-black/20 rounded-full overflow-hidden">
                <div className="h-full bg-white transition-all duration-500" style={{ width: `${((user?.currentXP || 0) % 100)}%` }} />
              </div>
              <p className="text-right text-xs mt-1">{user?.currentXP || 0} XP</p>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

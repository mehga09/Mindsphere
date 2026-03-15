import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';
import client from '../api/client';
import { subscribeToPush } from '../utils/notifications';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) return null;

  const handleEnableNotifications = async () => {
    if (user?.email) {
      try {
        await client.post('/api/content/recommendations/email');
        alert(`Notifications enabled! We sent your personalized video recommendations to ${user.email}.`);
      } catch (error) {
        console.error('Failed to send email', error);
        alert('Notifications enabled, but failed to send email summary.');
      }
    } else {
      try {
        await subscribeToPush();
        alert('Notifications enabled!');
      } catch (e) {
        console.warn("Push subscription skipped", e);
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/10 backdrop-blur-md border-b border-white/10 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
        <div>
          <Link to="/" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300">
            MindSphere
          </Link>
          <p className="text-sm text-gray-300">Welcome back, {user?.name}</p>
        </div>
        <div className="flex gap-4 items-center">
          <button 
            onClick={handleEnableNotifications} 
            className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full hover:bg-purple-500/30 transition-colors"
          >
            Enable Notifications
          </button>
          <Link 
            to="/daily-planner?view=courses" 
            className="group flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded-full text-sm font-bold transition-all shadow-lg shadow-purple-600/20 active:scale-95"
          >
            <Layers size={14} className="group-hover:rotate-12 transition-transform" />
            Plan My Course
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
  );
}

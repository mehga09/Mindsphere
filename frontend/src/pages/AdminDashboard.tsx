import { useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, AlertTriangle } from 'lucide-react';

interface FlagCase {
  id: string;
  reason: string;
  details?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  content: {
    title: string;
    url: string;
  };
  reporter: {
    name: string;
    email: string;
  };
  createdAt: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [cases, setCases] = useState<FlagCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const res = await client.get('/api/moderation/cases');
        setCases(res.data);
      } catch (error) {
        console.error('Failed to fetch cases', error);
      } finally {
        setLoading(false);
      }
    };
    if (user?.role === 'ADMIN') {
      fetchCases();
    }
  }, [user]);

  const handleResolve = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await client.post(`/api/moderation/cases/${id}/resolve`, { status, note: 'Resolved via dashboard' });
      setCases(cases.map(c => c.id === id ? { ...c, status } : c));
    } catch (error) {
      alert('Failed to update case');
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-xl text-center border border-white/20">
          <h1 className="text-xl font-bold text-red-500 mb-4">Access Denied</h1>
          <p className="mb-4 text-gray-300">You do not have permission to view this page.</p>
          <Link to="/" className="text-purple-400 hover:text-purple-300 hover:underline">Return Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-white/10 backdrop-blur-md shadow-sm p-4 sticky top-0 z-10 border-b border-white/10">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link to="/" className="text-gray-400 hover:text-white transition-colors"><ArrowLeft /></Link>
          <h1 className="text-xl font-bold text-white">Moderation Dashboard</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
        {loading ? (
          <div className="text-gray-400 text-center">Loading cases...</div>
        ) : cases.length === 0 ? (
          <div className="text-center text-gray-400 py-12 bg-white/5 rounded-2xl border border-white/10">No pending moderation cases.</div>
        ) : (
          <div className="space-y-4">
            {cases.map(c => (
              <div key={c.id} className="bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-white/10 flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${c.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                        c.status === 'APPROVED' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-green-500/20 text-green-300 border border-green-500/30'
                      }`}>
                      {c.status}
                    </span>
                    <span className="text-sm text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-bold text-lg mb-1 text-white">{c.content.title}</h3>
                  <p className="text-sm text-gray-400 mb-2">Reported by: {c.reporter.name} ({c.reporter.email})</p>
                  <div className="bg-black/20 p-3 rounded-lg text-sm text-gray-300 border border-white/5">
                    <strong className="block text-xs uppercase text-gray-500 mb-1">Reason: {c.reason}</strong>
                    {c.details}
                  </div>
                </div>

                {c.status === 'PENDING' && (
                  <div className="flex flex-col gap-2 justify-center min-w-[140px]">
                    <button
                      onClick={() => handleResolve(c.id, 'APPROVED')}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 border border-red-500/30 font-medium text-sm transition-all"
                    >
                      <AlertTriangle size={16} /> Mark as Violation
                    </button>
                    <button
                      onClick={() => handleResolve(c.id, 'REJECTED')}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 border border-green-500/30 font-medium text-sm transition-all"
                    >
                      <Check size={16} /> Dismiss Report
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

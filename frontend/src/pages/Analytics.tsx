import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import client from '../api/client';

import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { ArrowLeft, Zap, Activity, Flame, Trophy } from 'lucide-react';

interface WeeklyReport {
  weekStartDate: string;
  totalSessions: number;
  totalProductiveMins: number;
  score: number;
  chartData: { day: string; minutes: number }[];
}

export default function Analytics() {
  const { user } = useAuth();
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await client.get('/api/reports/latest');
        if (res.data && typeof res.data === 'object') {
          // Basic Validation
          if (!Array.isArray(res.data.chartData)) {
            console.warn("Chart data is not array, fixing:", res.data);
            res.data.chartData = [];
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen relative overflow-hidden pb-20 font-sans selection:bg-purple-500 selection:text-white">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-500/30 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-blob"></div>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/30 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-32 left-[20%] w-[600px] h-[600px] bg-pink-500/30 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-blob animation-delay-4000"></div>

      <header className="fixed top-0 w-full z-50 bg-white/5 backdrop-blur-md shadow-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-300 hover:text-white"><ArrowLeft size={20} /></Link>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300">Weekly Insights</h1>
              <span className="text-xs font-medium text-gray-400 tracking-wide uppercase">Neural Optimization Reports</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={async () => {
                if (!user) return;
                try {
                  setLoading(true);
                  await client.get(`/api/analytics/generate/${user.id}`);
                  // Refresh
                  const res = await client.get('/api/reports/latest');
                  setReport(res.data);
                } catch (e) {
                  console.error("Generation failed", e);
                } finally {
                  setLoading(false);
                }
              }}
              className="text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 rounded-full hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg"
            >
              Generate Report
            </button>
            {report && (
              <div className="bg-white/10 px-4 py-1.5 rounded-full border border-white/20 shadow-sm backdrop-blur-sm">
                <p className="text-sm font-medium text-gray-300">Week of {new Date(report.weekStartDate).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-28 pb-12 space-y-8 relative z-10 animate-fade-in">

        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Score Card - Enhanced */}
          <div className="col-span-1 md:col-span-1 bg-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/10 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-white/10 transition-all duration-500 min-h-[300px]">
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
                      strokeDashoffset={440 - (440 * report.score) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-5xl font-black text-white tracking-tighter">{report.score}</span>
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-widest mt-1">Points</span>
                  </div>
                </div>
                <p className="mt-6 text-center text-sm font-medium text-gray-300 z-10 bg-white/5 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10">
                  {report.score > 80 ? "✨ Optimizing Reality" : "🌱 Growth Detected"}
                </p>
              </>
            ) : (
              <div className="text-center">
                <div className="mb-4 text-gray-500 mx-auto"><Activity size={48} /></div>
                <p className="text-gray-400 font-medium">No Score Yet</p>
                <p className="text-xs text-gray-600 mt-1">Complete sessions to generate data</p>
              </div>
            )}
          </div>

          {/* Right Column Grid */}
          <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-6">

            {/* Stat 1 */}
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/10 hover:bg-white/10 hover:-translate-y-1 transition-all duration-300 group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                  <Zap size={24} />
                </div>
                <span className="text-xs font-bold text-blue-300 bg-blue-500/10 px-2 py-1 rounded-full uppercase tracking-wider">Total Output</span>
              </div>
              <p className="text-4xl font-black text-white mb-1">{report?.totalProductiveMins || 0}</p>
              <p className="text-sm font-medium text-gray-400">Productive Minutes</p>
            </div>

            {/* Stat 2 */}
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/10 hover:bg-white/10 hover:-translate-y-1 transition-all duration-300 group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-500/20 text-orange-400 rounded-2xl group-hover:bg-orange-500 group-hover:text-white transition-colors duration-300">
                  <Activity size={24} />
                </div>
                <span className="text-xs font-bold text-orange-300 bg-orange-500/10 px-2 py-1 rounded-full uppercase tracking-wider">Flow State</span>
              </div>
              <p className="text-4xl font-black text-white mb-1">{report?.totalSessions || 0}</p>
              <p className="text-sm font-medium text-gray-400">Deep Work Sessions</p>
            </div>

          </div>
        </div>

        {/* Bottom Section: Chart + Personal Growth Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left: Feature-Rich Chart Section */}
          <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/10 relative min-h-[400px] flex flex-col">
            {report ? (
              <>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-bold text-white">Activity Velocity</h3>
                    <p className="text-sm text-gray-400 mt-1">Temporal distribution of focus blocks</p>
                  </div>
                </div>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Array.isArray(report?.chartData) ? report.chartData : []}>
                      <defs>
                        <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a855f7" stopOpacity={1} />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 500 }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(168, 85, 247, 0.1)', radius: 8 }}
                        contentStyle={{
                          borderRadius: '12px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          backgroundColor: 'rgba(0,0,0,0.8)',
                          backdropFilter: 'blur(8px)',
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                          color: '#fff'
                        }}
                      />
                      <Bar
                        dataKey="minutes"
                        fill="url(#colorBar)"
                        radius={[6, 6, 6, 6]}
                        barSize={32}
                        animationDuration={1500}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <h3 className="text-xl font-bold text-gray-500 mb-2">No Reports Yet</h3>
                <p className="text-gray-600 max-w-md">Complete a full week of sessions to unlock your neural insights.</p>
              </div>
            )}
          </div>

          {/* Right: Personal Growth / Gamification Sidebar */}
          <div className="space-y-6">

            {/* Streak Card */}
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/10 hover:bg-white/10 hover:-translate-y-1 transition-all duration-300 group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-red-500/20 text-red-500 rounded-2xl group-hover:bg-red-500 group-hover:text-white transition-colors duration-300">
                  <Flame size={24} />
                </div>
                <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-full uppercase tracking-wider">Streak</span>
              </div>
              <p className="text-4xl font-black text-white mb-1">{user?.currentStreak || 0}</p>
              <p className="text-sm font-medium text-gray-400">Days Active</p>
            </div>

            {/* XP Card */}
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/10 hover:bg-white/10 hover:-translate-y-1 transition-all duration-300 group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-yellow-500/20 text-yellow-500 rounded-2xl group-hover:bg-yellow-500 group-hover:text-white transition-colors duration-300">
                  <Trophy size={24} />
                </div>
                <span className="text-xs font-bold text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-full uppercase tracking-wider">Level {user?.level || 1}</span>
              </div>
              <div className="flex justify-between items-end mb-2">
                <p className="text-4xl font-black text-white">{user?.currentXP || 0}</p>
                <p className="text-xs font-bold text-gray-500 uppercase">XP Points</p>
              </div>
              <div className="w-full bg-gray-700/50 rounded-full h-2 mt-2 overflow-hidden">
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full" style={{ width: `${Math.min((user?.currentXP || 0) % 1000 / 10, 100)}%` }}></div>
              </div>
              <p className="text-xs font-medium text-gray-500 mt-2 text-right">
                Next Level: {1000 - ((user?.currentXP || 0) % 1000)} XP
              </p>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}

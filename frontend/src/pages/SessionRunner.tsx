import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import client from '../api/client';
import { saveEventToBuffer } from '../utils/syncManager';
import { ArrowLeft, Clock, BookOpen, CheckCircle, XCircle, ChevronRight, SkipForward, Sparkles } from 'lucide-react';

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

type QuizState = 'idle' | 'loading' | 'active' | 'result';

export default function SessionRunner() {
  const { contentId } = useParams();
  const [searchParams] = useSearchParams();
  const studySessionId = searchParams.get('studySessionId');
  const navigate = useNavigate();
  const backPath = studySessionId ? '/schedule' : '/';
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [content, setContent] = useState<any>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Quiz state
  const [quizState, setQuizState] = useState<QuizState>('idle');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [endedSessionId, setEndedSessionId] = useState<string | null>(null);

  useEffect(() => {
    const start = async () => {
      try {
        const res = await client.post('/api/sessions/start', {
          contentId,
          ...(studySessionId ? { studySessionId } : {})
        });
        setSessionId(res.data.id);
        setContent(res.data.content);
      } catch (error) {
        console.error(error);
        alert('Failed to start session');
        navigate(backPath);
      }
    };
    if (contentId) start();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [contentId, navigate]);

  useEffect(() => {
    if (sessionId) {
      timerRef.current = setInterval(() => {
        setElapsed(e => e + 1);
        if (elapsed > 0 && elapsed % 30 === 0) {
          saveEventToBuffer({ sessionId, type: 'VIEW', timestamp: new Date().toISOString() });
        }
      }, 1000);
    }
    return () => clearInterval(timerRef.current!);
  }, [sessionId, elapsed]);

  const handleFinish = async () => {
    if (!sessionId) return;
    try {
      await saveEventToBuffer({ sessionId, type: 'COMPLETE', timestamp: new Date().toISOString() });
      const endRes = await client.post('/api/sessions/end', { sessionId, duration: elapsed });
      setEndedSessionId(endRes.data.id);
      if (timerRef.current) clearInterval(timerRef.current);

      // Fetch quiz
      setQuizState('loading');
      try {
        const quizRes = await client.get(`/api/content/${contentId}/quiz`);
        const qs: QuizQuestion[] = quizRes.data.questions;
        if (qs && qs.length > 0) {
          setQuestions(qs);
          setSelectedAnswers(new Array(qs.length).fill(-1));
          setCurrentQ(0);
          setSelectedOption(null);
          setScore(0);
          setQuizState('active');
        } else {
          navigate(backPath);
        }
      } catch {
        navigate(backPath);
      }
    } catch (error) {
      console.error('Failed to end session', error);
      navigate(backPath);
    }
  };

  const handleSelectOption = (idx: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(idx);
    const updated = [...selectedAnswers];
    updated[currentQ] = idx;
    setSelectedAnswers(updated);
    if (idx === questions[currentQ].correctIndex) setScore(s => s + 1);
  };

  const handleNextQuestion = () => {
    if (currentQ + 1 < questions.length) {
      setCurrentQ(q => q + 1);
      setSelectedOption(null);
    } else {
      submitQuiz();
    }
  };

  const submitQuiz = async () => {
    try {
      await client.post(`/api/content/${contentId}/quiz/submit`, {
        answers: selectedAnswers,
        sessionId: endedSessionId
      });
    } catch { /* ignore */ }
    setQuizState('result');
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const renderContent = () => {
    if (!content) return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-400">Loading content...</p>
      </div>
    );

    if (content.type === 'VIDEO' || content.url?.includes('youtube') || content.url?.includes('youtu.be')) {
      const videoId = content.url?.split('v=')[1]?.split('&')[0] || content.url?.split('/').pop();
      const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
      return (
        <iframe
          src={embedUrl}
          title={content.title}
          className="w-full h-full rounded-xl"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }

    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">{content.title}</h2>
        <p className="text-gray-400 mb-6">This content involves reading or external practice.</p>
        <a
          href={content.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition"
        >
          Open Resource <BookOpen size={20} />
        </a>
      </div>
    );
  };

  // ── Quiz Loading ──────────────────────────────────────────────────────────
  if (quizState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-12 text-center shadow-2xl">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-purple-500 border-t-transparent mx-auto mb-5"></div>
          <h2 className="text-xl font-bold text-white mb-1">Generating Your Quiz</h2>
          <p className="text-gray-400 text-sm">Our AI is crafting questions based on what you just watched...</p>
        </div>
      </div>
    );
  }

  // ── Quiz Active ───────────────────────────────────────────────────────────
  if (quizState === 'active' && questions.length > 0) {
    const q = questions[currentQ];
    const answered = selectedOption !== null;
    const isCorrect = selectedOption === q.correctIndex;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 pt-10">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-purple-400" />
              <span className="text-sm font-semibold text-purple-300">Knowledge Check</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400 font-mono">
                {currentQ + 1} / {questions.length}
              </span>
              <button
                onClick={() => navigate(backPath)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition"
              >
                <SkipForward size={14} /> Skip
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-white/10 rounded-full mb-6 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${(currentQ / questions.length) * 100}%` }}
            />
          </div>

          {/* Question card */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-lg font-semibold text-white mb-6 leading-snug">{q.question}</h2>

            <div className="space-y-3">
              {q.options.map((opt, idx) => {
                let base = 'w-full text-left px-5 py-4 rounded-xl border transition-all duration-200 flex items-center justify-between text-sm font-medium ';
                if (!answered) {
                  base += 'border-white/10 bg-white/5 hover:border-purple-500/60 hover:bg-purple-500/10 cursor-pointer text-gray-200';
                } else if (idx === q.correctIndex) {
                  base += 'border-green-500/60 bg-green-500/10 text-green-300 cursor-default';
                } else if (idx === selectedOption) {
                  base += 'border-red-500/60 bg-red-500/10 text-red-300 cursor-default';
                } else {
                  base += 'border-white/5 bg-white/5 opacity-40 cursor-default text-gray-400';
                }

                return (
                  <button key={idx} onClick={() => handleSelectOption(idx)} className={base}>
                    <span>{opt}</span>
                    {answered && idx === q.correctIndex && <CheckCircle size={18} className="text-green-400 shrink-0" />}
                    {answered && idx === selectedOption && idx !== q.correctIndex && <XCircle size={18} className="text-red-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {answered && q.explanation && (
              <div className="mt-5 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl text-sm text-purple-300">
                💡 {q.explanation}
              </div>
            )}

            {/* Feedback + Next */}
            {answered && (
              <div className="mt-6 flex items-center justify-between">
                <span className={`text-sm font-semibold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                  {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                </span>
                <button
                  onClick={handleNextQuestion}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-full font-medium transition shadow-lg"
                >
                  {currentQ + 1 < questions.length ? 'Next' : 'See Results'} <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Quiz Result ───────────────────────────────────────────────────────────
  if (quizState === 'result') {
    const percentage = Math.round((score / questions.length) * 100);
    const passed = percentage >= 50;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-10 shadow-2xl text-center">
          <div className="text-5xl mb-4">
            {percentage === 100 ? '🏆' : passed ? '🎉' : '📚'}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {passed ? 'Great job!' : 'Keep learning!'}
          </h2>
          <p className="text-gray-400 mb-8 text-sm">
            {passed ? 'You earned bonus XP for passing the quiz.' : 'Score 50% or more to earn bonus XP.'}
          </p>

          {/* Score ring */}
          <div className="flex items-center justify-center mb-8">
            <div className={`w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center ${passed ? 'border-purple-500' : 'border-white/20'}`}>
              <span className="text-3xl font-extrabold text-white">{score}/{questions.length}</span>
              <span className="text-xs text-gray-400 mt-0.5">{percentage}%</span>
            </div>
          </div>

          <button
            onClick={() => navigate(backPath)}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3 rounded-full font-semibold transition shadow-lg"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ── Normal Session View ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 flex justify-between items-center bg-white/10 backdrop-blur-md border-b border-white/10 shadow-sm sticky top-0 z-10">
        <button
          onClick={() => navigate(backPath)}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft />
        </button>
        <div className="flex items-center gap-2 font-mono text-lg text-white">
          <Clock size={18} className="text-purple-400" />
          {formatTime(elapsed)}
        </div>
        <div />
      </header>

      <main className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-5xl w-full aspect-video bg-white/5 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl overflow-hidden relative">
          {renderContent()}
        </div>
      </main>

      <footer className="p-8 flex justify-center bg-white/5 backdrop-blur-md border-t border-white/10">
        <button
          onClick={handleFinish}
          className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-full font-bold text-white transition shadow-lg"
        >
          End Session
        </button>
      </footer>
    </div>
  );
}

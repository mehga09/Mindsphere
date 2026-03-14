import { Play, FileText, Clock } from 'lucide-react';

interface Content {
  id: string;
  title: string;
  type: 'VIDEO' | 'ARTICLE' | 'MICRO_MODULE';
  duration: number; // seconds
  thumbnail?: string;
  explanation?: string;
}

export function RecommendationCard({ content, onStart }: { content: Content; onStart: (id: string) => void }) {
  const formatDuration = (sec: number) => {
    if (sec >= 86400) {
      return `${Math.floor(sec / 86400)}d ${Math.floor((sec % 86400) / 3600)}h`;
    }
    if (sec >= 3600) {
      return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
    }
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${min}:${s.toString().padStart(2, '0')}` : `${min} min`;
  };

  return (
    <div className="flex flex-col rounded-xl bg-white/5 backdrop-blur-md overflow-hidden hover:bg-white/10 transition-all border border-white/10 hover:border-white/20 shadow-lg hover:shadow-xl group">
      <div className="h-40 w-full bg-black/40 relative">
        {content.thumbnail ? (
          <img src={content.thumbnail} alt={content.title} className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-gray-400">
            {content.type === 'VIDEO' ? <Play size={48} className="text-white/20" /> : <FileText size={48} className="text-white/20" />}
          </div>
        )}
        <div className="absolute top-2 right-2 rounded-full bg-black/60 backdrop-blur-sm px-2 py-1 text-xs text-white flex items-center gap-1 border border-white/10">
          <Clock size={12} className="text-purple-300" />
          {formatDuration(content.duration)}
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide border ${content.type === 'VIDEO' ? 'bg-red-500/20 text-red-300 border-red-500/20' : 'bg-blue-500/20 text-blue-300 border-blue-500/20'
            }`}>
            {content.type}
          </span>
        </div>

        <h3 className="text-lg font-bold text-white mb-1 leading-tight group-hover:text-purple-300 transition-colors">{content.title}</h3>

        {content.explanation && (
          <p className="text-xs text-gray-400 italic mt-auto border-t pt-2 border-white/10">
            ✨ {content.explanation}
          </p>
        )}

        <button
          onClick={() => onStart(content.id)}
          className="mt-4 w-full rounded-lg bg-white/10 py-2 text-sm font-semibold text-white hover:bg-white/20 border border-white/10 active:scale-[0.98] transition-all"
        >
          Start Session
        </button>
      </div>
    </div>
  );
}

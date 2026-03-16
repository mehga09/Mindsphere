import { useForm } from 'react-hook-form';
// import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { useNavigate } from 'react-router-dom';

interface PreferenceForm {
  topics: string[];
  dailyGoalMins: number;
  quietHoursStart: string;
  quietHoursEnd: string;
}

const TOPIC_OPTIONS = ['Technology', 'Health', 'History', 'Science', 'Productivity', 'Art'];

export default function Survey() {
  // const { updatePreferences } = useAuth(); // Removed
  const navigate = useNavigate();
  const { register, handleSubmit, watch, setValue } = useForm<PreferenceForm>({
    defaultValues: {
      topics: [],
      dailyGoalMins: 15,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00'
    }
  });

  const selectedTopics = watch('topics');

  const handleTopicToggle = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      setValue('topics', selectedTopics.filter(t => t !== topic));
    } else {
      setValue('topics', [...selectedTopics, topic]);
    }
  };

  const onSubmit = async (data: PreferenceForm) => {
    try {
      await client.put('/api/profile/preferences', data);
      navigate('/');
    } catch (error: any) {
      console.error('Failed to save preferences', error);
      alert('Failed to save preferences');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-8 shadow-2xl animate-fade-in">
        <h2 className="mb-6 text-2xl font-bold text-center text-white">Customize Your Experience</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Interests (Pick at least 1)</label>
            <div className="flex flex-wrap gap-2">
              {TOPIC_OPTIONS.map(topic => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => handleTopicToggle(topic)}
                  className={`px-3 py-1 rounded-full text-sm font-medium border transition-all ${selectedTopics.includes(topic)
                    ? 'bg-purple-600 text-white border-purple-500 shadow-[0_0_10px_rgba(147,51,234,0.5)]'
                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:border-white/30'
                    }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">Daily Learning Goal (Minutes)</label>
            <input
              {...register('dailyGoalMins', { valueAsNumber: true })}
              type="range"
              min="5"
              max="60"
              step="5"
              className="mt-2 w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="text-center text-sm text-gray-400 mt-1">{watch('dailyGoalMins')} mins</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Quiet Hours Start</label>
              <input
                {...register('quietHoursStart')}
                type="time"
                className="block w-full rounded-lg bg-white/5 border border-white/10 p-2 text-white shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Quiet Hours End</label>
              <input
                {...register('quietHoursEnd')}
                type="time"
                className="block w-full rounded-lg bg-white/5 border border-white/10 p-2 text-white shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 py-3 text-white font-semibold shadow-lg hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transform transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Save & Continue
          </button>
        </form>
      </div>
    </div>
  );
}

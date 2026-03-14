import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, type LoginDto } from '@mindsphere/shared';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginDto>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginDto) => {
    try {
      await login(data);
      navigate('/');
    } catch (error: any) {
      console.error('Login failed', error);
      const message = error.response?.data?.error || error.message || 'Login failed';
      alert(message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* Background blobs for login page specifically if global isn't enough, but relying on global body gradient is better. 
          Let's add some local flair though. */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/20 blur-[100px] animate-blob" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/20 blur-[100px] animate-blob animation-delay-2000" />
      </div>

      <div className="w-full max-w-md rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-8 shadow-2xl animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300">MindSphere</h1>
          <h2 className="mt-2 text-xl font-medium text-gray-200">Welcome Back</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              {...register('email')}
              type="email"
              className="block w-full rounded-lg bg-white/5 border border-white/10 p-2.5 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500 focus:outline-none transition-all"
              placeholder="you@example.com"
            />
            {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input
              {...register('password')}
              type="password"
              className="block w-full rounded-lg bg-white/5 border border-white/10 p-2.5 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500 focus:outline-none transition-all"
              placeholder="••••••••"
            />
            {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>}
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 py-3 text-white font-semibold shadow-lg hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transform transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Sign In
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-400">
          Don't have an account? <Link to="/register" className="font-medium text-purple-400 hover:text-purple-300 transition-colors">Create one now</Link>
        </p>
      </div>
    </div>
  );
}

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterSchema, type RegisterDto } from '@mindsphere/shared';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export default function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterDto>({
    resolver: zodResolver(RegisterSchema),
  });

  const onSubmit = async (data: RegisterDto) => {
    try {
      await registerUser(data);
      navigate('/survey');
    } catch (error: any) {
      console.error('Registration error:', error);
      const msg = error.response?.data?.error || error.response?.data?.message || error.message || 'Registration failed';
      alert(msg);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/20 blur-[100px] animate-blob" />
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-pink-500/20 blur-[100px] animate-blob animation-delay-2000" />
      </div>

      <div className="w-full max-w-md rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-8 shadow-2xl animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-300">Join MindSphere</h1>
          <h2 className="mt-2 text-xl font-medium text-gray-200">Start Your Journey</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
            <input
              {...register('name')}
              type="text"
              className="block w-full rounded-lg bg-white/5 border border-white/10 p-2.5 text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-cyan-500 focus:outline-none transition-all"
              placeholder="John Doe"
            />
            {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              {...register('email')}
              type="email"
              className="block w-full rounded-lg bg-white/5 border border-white/10 p-2.5 text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-cyan-500 focus:outline-none transition-all"
              placeholder="you@example.com"
            />
            {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input
              {...register('password')}
              type="password"
              className="block w-full rounded-lg bg-white/5 border border-white/10 p-2.5 text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-cyan-500 focus:outline-none transition-all"
              placeholder="Create a strong password"
            />
            {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>}
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-gradient-to-r from-cyan-600 to-purple-600 py-3 text-white font-semibold shadow-lg hover:from-cyan-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 transform transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Create Account
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account? <Link to="/login" className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors">Sign In</Link>
        </p>
      </div>
    </div>
  );
}

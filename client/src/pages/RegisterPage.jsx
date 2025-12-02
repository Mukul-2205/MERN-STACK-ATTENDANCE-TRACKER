import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const RegisterPage = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'student' });
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await register(formData);
    if (result.success) {
      navigate('/login');
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 px-4">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.35),transparent_60%),_radial-gradient(circle_at_bottom,_rgba(16,185,129,0.25),transparent_55%)]" />
      <div className="relative z-10 w-full max-w-md">
        <form
          onSubmit={handleSubmit}
          className="backdrop-blur-xl bg-white/10 border border-white/15 shadow-2xl rounded-2xl px-8 py-10 space-y-6 text-slate-100"
        >
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight">Create an account</h2>
            <p className="text-sm text-slate-300">
              Join as a student or teacher and start learning today.
            </p>
          </div>

          {error && (
            <p className="text-red-300 text-sm text-center bg-red-900/40 border border-red-500/40 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="name" className="text-sm font-medium text-slate-200">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-600/70 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium text-slate-200">
                Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-600/70 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium text-slate-200">
                Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-600/70 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="role" className="text-sm font-medium text-slate-200">
                Role
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-600/70 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              >
                <option value="student" className="bg-slate-900">
                  Student
                </option>
                <option value="teacher" className="bg-slate-900">
                  Teacher
                </option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:shadow-emerald-500/30 hover:brightness-110 active:scale-[0.98] transition"
          >
            Register
          </button>

          <p className="mt-2 text-center text-xs text-slate-300">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-emerald-400 hover:text-emerald-300 underline-offset-4 hover:underline">
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;

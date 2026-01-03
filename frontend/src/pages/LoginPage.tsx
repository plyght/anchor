import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthActions } from '@convex-dev/auth/react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { signIn } = useAuthActions();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await signIn('password', { email, password, flow: 'signIn' });
      navigate('/');
    } catch (err) {
      setError('Authentication failed: Invalid credentials');
      console.error('Login error:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-void p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-scanline opacity-10 pointer-events-none"></div>
      
      <div className="bg-surface border border-tactical p-8 w-full max-w-md relative z-10 shadow-glow-blue">
        <div className="border-b border-tactical pb-4 mb-8 text-center">
          <h1 className="text-4xl font-display font-bold text-white uppercase tracking-widest mb-1">
            Anchor
          </h1>
          <p className="font-mono text-xs text-neon-blue uppercase tracking-[0.3em]">
            Secure Access Terminal
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-neon-red/10 border border-neon-red text-neon-red px-4 py-3 font-mono text-sm uppercase">
              [ERROR]: {error}
            </div>
          )}
          
          <div>
            <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">
              Identity (Email)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-void border border-tactical p-3 text-white font-mono focus:border-neon-blue focus:outline-none transition-colors"
              placeholder="OPERATOR_ID"
              required
            />
          </div>
          
          <div>
            <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">
              Passcode
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-void border border-tactical p-3 text-white font-mono focus:border-neon-blue focus:outline-none transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-neon-blue text-black border border-neon-blue py-3 font-mono font-bold uppercase tracking-widest hover:bg-white hover:border-white transition-all duration-200 mt-4"
          >
            Authenticate
          </button>
        </form>

        <div className="mt-8 text-center border-t border-tactical pt-4">
          <p className="text-xs font-mono text-gray-500">
            NO CREDENTIALS?{' '}
            <Link to="/signup" className="text-neon-blue hover:text-white uppercase decoration-none border-b border-neon-blue hover:border-white transition-colors">
              Request Access
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

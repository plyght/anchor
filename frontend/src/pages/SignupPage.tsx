import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthActions } from '@convex-dev/auth/react';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    bitchatUsername: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const { signIn } = useAuthActions();
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await signIn('password', { 
        email: formData.email, 
        password: formData.password, 
        flow: 'signUp' 
      });
      navigate('/');
    } catch (err) {
      setError('Registration failed: Email conflict or system error');
      console.error('Signup error:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-void p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-scanline opacity-10 pointer-events-none"></div>

      <div className="bg-surface border border-tactical p-8 w-full max-w-md relative z-10 shadow-glow-blue">
        <div className="border-b border-tactical pb-4 mb-8 text-center">
          <h1 className="text-3xl font-display font-bold text-white uppercase tracking-wider mb-1">
            Unit Registration
          </h1>
          <p className="font-mono text-xs text-neon-green uppercase tracking-[0.3em]">
            New Personnel Onboarding
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          {error && (
            <div className="bg-neon-red/10 border border-neon-red text-neon-red px-4 py-3 font-mono text-sm uppercase">
              [ERROR]: {error}
            </div>
          )}
          
          <div>
            <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">
              Full Designation (Name)
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full bg-void border border-tactical p-3 text-white font-mono focus:border-neon-green focus:outline-none transition-colors"
              placeholder="e.g. JOHN DOE"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">
              Comms ID (Email)
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-void border border-tactical p-3 text-white font-mono focus:border-neon-green focus:outline-none transition-colors"
              placeholder="operator@anchor.net"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">
              Security Key (Password)
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-void border border-tactical p-3 text-white font-mono focus:border-neon-green focus:outline-none transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">
                BitChat Handle
              </label>
              <input
                type="text"
                value={formData.bitchatUsername}
                onChange={(e) => setFormData({ ...formData, bitchatUsername: e.target.value })}
                className="w-full bg-void border border-tactical p-3 text-white font-mono focus:border-neon-green focus:outline-none transition-colors"
                placeholder="@handle"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">
                Frequency (Phone)
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-void border border-tactical p-3 text-white font-mono focus:border-neon-green focus:outline-none transition-colors"
                placeholder="(Optional)"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-neon-green text-black border border-neon-green py-3 font-mono font-bold uppercase tracking-widest hover:bg-white hover:border-white transition-all duration-200 mt-6"
          >
            Initialize Unit
          </button>
        </form>

        <div className="mt-8 text-center border-t border-tactical pt-4">
          <p className="text-xs font-mono text-gray-500">
            EXISTING UNIT?{' '}
            <Link to="/login" className="text-neon-green hover:text-white uppercase decoration-none border-b border-neon-green hover:border-white transition-colors">
              Access Terminal
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path ? 'text-neon-blue border-b-2 border-neon-blue' : 'text-gray-400 hover:text-white';
  };

  return (
    <header className="border-b border-tactical bg-surface/95 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-neon-green rounded-full shadow-[0_0_8px_rgba(0,255,157,0.6)] animate-pulse-fast"></div>
          <Link to="/" className="text-3xl font-display font-bold tracking-widest text-white uppercase flex items-center gap-2">
            Anchor
            <span className="text-xs font-mono text-gray-500 font-normal border border-gray-700 px-1 py-0.5 rounded-none">v2.0</span>
          </Link>
        </div>
        
        <nav className="flex gap-8">
          {[
            { path: '/', label: 'Tasks' },
            { path: '/admin', label: 'Command' },
            { path: '/profile', label: 'Personnel' },
            { path: '/login', label: 'Auth' }
          ].map((link) => (
            <Link 
              key={link.path}
              to={link.path} 
              className={`font-mono text-sm uppercase tracking-widest py-5 transition-colors duration-100 ${isActive(link.path)}`}
            >
              <span className="opacity-50 mr-1">//</span>{link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

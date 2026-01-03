import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ShieldAlert, LayoutDashboard, Users, UserCircle } from 'lucide-react';

export default function Header() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin', label: 'Admin', icon: ShieldAlert },
    { path: '/profile', label: 'Profile', icon: UserCircle },
    { path: '/login', label: 'Login', icon: Users },
  ];

  const isActive = (path: string) => {
    return location.pathname === path 
      ? 'text-primary bg-primary/10' 
      : 'text-muted-foreground hover:text-primary hover:bg-muted';
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <Link to="/" className="text-xl font-heading font-bold tracking-tight text-foreground flex items-center gap-2">
            Anchor
          </Link>
        </div>
        
        <nav className="flex gap-1">
          {navItems.map((link) => {
            const Icon = link.icon;
            return (
              <Link 
                key={link.path}
                to={link.path} 
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive(link.path)
                )}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

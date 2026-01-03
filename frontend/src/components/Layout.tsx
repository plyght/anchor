import type { ReactNode } from 'react';
import Header from './Header';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none bg-scanline opacity-10 z-50"></div>
      <Header />
      <main className="container mx-auto px-4 py-8 flex-grow relative z-10">
        {children}
      </main>
    </div>
  );
}

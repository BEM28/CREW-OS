import { useState, useEffect } from 'react';
import { useUserStore } from '../../store/userStore';
import { Link, useLocation } from 'react-router-dom';
import { 
  Building2, Search, Bell, Menu, LayoutDashboard, 
  FolderKanban, Users, MessageSquareQuote, FileText, Settings, User
} from 'lucide-react';
import clsx from 'clsx';
import { auth } from '../../lib/firebase/client';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUserStore();
  const location = useLocation();

  const NAV_ITEMS = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { label: 'Projects', icon: FolderKanban, href: '/projects' },
    { label: 'Crew', icon: Users, href: '/crew' },
    { label: 'Sessions', icon: MessageSquareQuote, href: '/sessions' },
    { label: 'Deliverables', icon: FileText, href: '/deliverables' },
    { label: 'Settings', icon: Settings, href: '/settings' },
  ];

  return (
    <div className="flex h-screen bg-background text-text-primary overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-64 border-r border-border bg-surface flex flex-col">
        <div className="h-[72px] flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold tracking-tight">CREW OS</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {NAV_ITEMS.map(item => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link 
                key={item.href}
                to={item.href}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  isActive ? "bg-surface-2 text-text-primary" : "text-text-secondary hover:text-text-primary hover:bg-white/[0.02]"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-2 cursor-pointer transition-colors" onClick={() => auth.signOut()}>
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-surface-2 border border-border flex items-center justify-center">
                <User className="w-4 h-4 text-text-secondary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.name}</div>
              <div className="text-xs text-text-muted truncate">{user?.email}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-[72px] border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-8 z-10 sticky top-0">
          <div className="flex items-center gap-4 text-sm font-medium text-text-secondary">
             <span>My Company</span>
             <span className="text-border">/</span>
             <span className="text-text-primary capitalize">{location.pathname.replace('/', '')}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input 
                placeholder="Search command center... (Cmd+K)"
                className="w-[280px] h-9 bg-surface border border-border rounded-lg pl-9 pr-4 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <button className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface transition-colors">
              <Bell className="w-4 h-4" />
            </button>
          </div>
        </header>
        
        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

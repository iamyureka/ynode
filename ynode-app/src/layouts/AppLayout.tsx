import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Workflow,
  ListMusic,
  LogOut,
  Key,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

export function AppLayout() {
  const { logout } = useAuthStore();
  const location = useLocation();

  const isInEditor =
    location.pathname.startsWith('/editor') ||
    location.pathname === '/new-workflow';

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Overview' },
    { to: '/workflows', icon: Workflow, label: 'Workflows' },
    { to: '/executions', icon: ListMusic, label: 'Executions' },
    { to: '/settings/credentials', icon: Key, label: 'Credentials' },
  ];

  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden selection:bg-primary/20 font-sans">
      {/* Desktop Sidebar */}
      {!isInEditor && (
        <aside className="hidden lg:flex w-16 hover:w-56 group/sidebar flex-col border-r border-border bg-sidebar h-full flex-shrink-0 z-40 transition-all duration-300 overflow-hidden">
          {/* Logo */}
          <div className="h-16 flex items-center px-4 border-b border-border shrink-0">
            <NavLink to="/" className="flex items-center gap-3">
              <img
                src="/ynode_white_orange.svg"
                alt="ynode"
                className="h-8 w-8 shrink-0"
              />
              <span className="text-lg font-semibold text-white whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
                y<span className="text-primary">node</span>
              </span>
            </NavLink>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 px-2 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 h-10 px-3 rounded-md transition-all duration-150 relative group/item',
                    isActive
                      ? 'bg-primary/10 text-white'
                      : 'text-zinc-500 hover:text-white hover:bg-white/5'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r" />
                    )}
                    <item.icon
                      className={cn(
                        'h-5 w-5 shrink-0 transition-colors',
                        isActive ? 'text-primary' : ''
                      )}
                    />
                    <span className="text-sm font-medium whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-2 border-t border-border shrink-0">
            <button
              onClick={logout}
              className="flex items-center gap-3 w-full h-10 px-3 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/5 transition-all group/item"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
                Sign Out
              </span>
            </button>
          </div>
        </aside>
      )}

      {/* Mobile Header */}
      {!isInEditor && (
        <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-sidebar/95 backdrop-blur-md border-b border-border z-50 flex items-center justify-center px-4">
          <NavLink to="/" className="flex items-center gap-2">
            <img src="/ynode_white_orange.svg" alt="ynode" className="h-7 w-auto" />
            <span className="text-lg font-semibold text-white">
              y<span className="text-primary">node</span>
            </span>
          </NavLink>
        </header>
      )}

      {/* Main Content */}
      <main
        className={cn(
          'flex-1 relative z-10',
          isInEditor
            ? 'overflow-hidden'
            : 'overflow-y-auto pt-14 pb-20 lg:pt-0 lg:pb-0'
        )}
      >
        {isInEditor ? (
          <Outlet />
        ) : (
          <div className="min-h-full p-4 lg:p-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        )}
      </main>

      {/* Mobile Bottom Nav */}
      {!isInEditor && (
        <nav className="lg:hidden fixed bottom-4 left-4 right-4 h-14 bg-sidebar/95 backdrop-blur-md border border-border rounded-2xl z-50 flex items-center justify-around px-1 shadow-xl shadow-black/20">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 rounded-xl transition-all',
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-zinc-500 active:text-zinc-300 active:bg-white/5'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn('h-5 w-5', isActive && 'drop-shadow-[0_0_6px_theme(colors.primary.DEFAULT)]')} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            onClick={logout}
            className="flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 rounded-xl text-zinc-500 active:text-red-400 active:bg-red-500/10 transition-all"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-[10px] font-medium">Logout</span>
          </button>
        </nav>
      )}
    </div>
  );
}

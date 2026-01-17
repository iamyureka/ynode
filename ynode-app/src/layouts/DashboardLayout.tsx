import { Outlet, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Workflow,
  ListMusic,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

export function DashboardLayout() {
  const { logout } = useAuthStore();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Overview' },
    { to: '/workflows', icon: Workflow, label: 'Workflows' },
    { to: '/executions', icon: ListMusic, label: 'Executions' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="h-screen bg-sidebar text-foreground flex overflow-hidden selection:bg-primary/20 font-sans">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/5 blur-[120px]" />
      </div>

      <aside className="hidden lg:flex w-72 flex-col border-r border-white/[0.08] bg-sidebar/60 backdrop-blur-xl h-full flex-shrink-0 z-40">
        <div className="p-8 pb-10">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-tight text-white leading-none">
                ynode
              </span>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-1">
                Automation
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Platform
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
                  isActive
                    ? 'bg-white/[0.08] text-white'
                    : 'text-muted-foreground hover:text-zinc-300 hover:bg-white/[0.04]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <item.icon
                      className={cn(
                        'h-4 w-4 transition-colors',
                        isActive
                          ? 'text-primary'
                          : 'text-muted-foreground group-hover:text-muted-foreground'
                      )}
                    />
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                  {isActive && (
                    <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_theme(colors.primary.DEFAULT)]" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/[0.08] bg-sidebar/20 flex-shrink-0">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/5 transition-all group text-sm font-medium"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-sidebar/80 backdrop-blur-xl border-b border-white/[0.08] z-40 flex items-center justify-center px-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg text-white">ynode</span>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto relative z-10 pt-14 pb-20 lg:pt-0 lg:pb-0">
        <div className="min-h-full p-4 lg:p-10 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-sidebar/90 backdrop-blur-xl border-t border-white/[0.08] z-40 flex items-center justify-around px-2 safe-area-inset-bottom">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-xl transition-colors min-w-[60px]',
                isActive ? 'text-primary' : 'text-muted-foreground active:text-zinc-300'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    'h-5 w-5',
                    isActive &&
                    'drop-shadow-[0_0_8px_theme(colors.primary.DEFAULT)]'
                  )}
                />
                <span className="text-[10px] font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          onClick={logout}
          className="flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-xl text-muted-foreground active:text-red-400 transition-colors min-w-[60px]"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-[10px] font-medium">Logout</span>
        </button>
      </nav>
    </div>
  );
}


import { FlaskConical, Library, Sparkles } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { isDemoMode } from '../../api';
import { API_BASE_URL } from '../../api/client';
import { cn } from '../../lib/cn';

const NAV_ITEMS = [
  { to: '/documents', label: 'Documents', icon: Library },
  { to: '/chat', label: 'RAG Chat', icon: Sparkles },
];

export function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-indigo-500 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/10 bg-black/20 px-4 py-6 lg:flex">
        <Brand />
        <nav aria-label="Primary" className="mt-8 flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500/20 to-violet-500/10 text-white'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200',
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 border-t border-white/10 pt-4">
          {isDemoMode && (
            <span className="flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1 text-xs font-medium text-violet-300">
              <FlaskConical aria-hidden="true" className="h-3.5 w-3.5" />
              Demo mode — mocked API
            </span>
          )}
          <p className="px-1 font-mono text-[11px] leading-relaxed text-slate-600">{API_BASE_URL}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/10 bg-black/20 px-4 py-3 lg:hidden">
          <Brand />
        </header>
        <nav aria-label="Mobile" className="flex gap-2 overflow-x-auto px-4 py-2 lg:hidden">
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium',
                  isActive ? 'bg-indigo-500/20 text-white' : 'text-slate-400 hover:text-slate-200',
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <NavLink to="/documents" className="flex items-center gap-3" aria-label="KnowledgeOS home">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 font-bold text-white shadow-lg shadow-indigo-950/40">
        K
      </span>
      <span className="text-lg font-semibold tracking-tight text-white">KnowledgeOS</span>
    </NavLink>
  );
}

import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, ShieldCheck } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import { ChatActivityProvider } from '../chat/ChatActivityProvider';
import { useAuthStore } from '../../stores/auth';
import { isAdmin } from '../../lib/permissions';
import { cn, getInitials } from '../../lib/utils';

const SIDEBAR_STORAGE_KEY = 'knowledgeos.sidebar.collapsed';
const EXPANDED_WIDTH = 280;
const COLLAPSED_WIDTH = 76;

const pageTitles: Record<string, string> = {
  '/chat': 'Chat',
  '/documents': 'Documents',
  '/admin/users': 'Users',
  '/admin/departments': 'Departments',
  '/profile': 'Profile',
};

function resolveTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith('/chat/')) return 'Chat';
  if (pathname.startsWith('/admin/users/')) return 'Edit user';
  return 'KnowledgeOS';
}

export default function AppShell() {
  const { user } = useAuthStore();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const title = resolveTitle(location.pathname);
  const admin = isAdmin(user);

  useEffect(() => {
    document.title = `${title} · KnowledgeOS`;
  }, [title]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
    } catch {
      // ignore storage errors
    }
  }, [collapsed]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  return (
    <ChatActivityProvider>
      <div className="flex h-dvh overflow-hidden bg-[#f8f9fc]">
        <aside
          style={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
          className="hidden shrink-0 overflow-hidden border-r border-outline-variant/40 bg-surface-container-lowest transition-[width] duration-200 ease-out lg:block"
        >
          <AppSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((value) => !value)} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-outline-variant/40 bg-surface-container-lowest/90 px-3 backdrop-blur lg:px-5">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open navigation"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-ring lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <h1 className="truncate text-sm font-semibold text-on-surface">{title}</h1>
              {admin ? (
                <span className="hidden items-center gap-1 rounded-full bg-secondary-container/70 px-2 py-0.5 text-[11px] font-medium text-on-secondary-container sm:inline-flex">
                  <ShieldCheck className="h-3 w-3" />
                  Admin
                </span>
              ) : null}
            </div>

            <Link
              to="/profile"
              aria-label="Open profile"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-xs font-semibold text-on-primary-fixed-variant transition-opacity hover:opacity-80 focus-ring lg:hidden"
            >
              {getInitials(user?.username)}
            </Link>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-[#0f172a]/40 backdrop-blur-[1px] animate-fade-in"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className={cn(
              'relative z-10 flex h-full w-[284px] max-w-[85vw] flex-col border-r border-outline-variant/40 bg-surface-container-lowest shadow-modal',
              'animate-slide-in-left',
            )}
          >
            <AppSidebar mobile onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      ) : null}
    </ChatActivityProvider>
  );
}

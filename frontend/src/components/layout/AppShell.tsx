import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bot,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  GripVertical,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/auth';
import { isAdmin } from '../../lib/permissions';
import { cn, getInitials } from '../../lib/utils';
import { Button } from '../ui/Button';

const SIDEBAR_STORAGE_KEY = 'knowledgeos.sidebar';
const SIDEBAR_WIDTH_KEY = 'knowledgeos.sidebar.width';
const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 320;
const DEFAULT_SIDEBAR_WIDTH = 240;

const navItems = [
  { to: '/chat', label: 'Chat', icon: Bot },
  { to: '/documents', label: 'Documents', icon: FileText },
];

const adminItems = [
  { to: '/admin/users', label: 'Users', icon: ShieldCheck },
  { to: '/admin/departments', label: 'Departments', icon: Building2 },
];

const pageTitles: Record<string, string> = {
  '/chat': 'Chat',
  '/documents': 'Documents',
  '/admin/users': 'Users',
  '/admin/departments': 'Departments',
  '/profile': 'Profile',
};

export default function AppShell() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'collapsed';
    } catch {
      return false;
    }
  });
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_WIDTH_KEY);
      const n = raw ? Number(raw) : DEFAULT_SIDEBAR_WIDTH;
      if (Number.isNaN(n)) return DEFAULT_SIDEBAR_WIDTH;
      return Math.min(Math.max(n, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH);
    } catch {
      return DEFAULT_SIDEBAR_WIDTH;
    }
  });
  const [resizing, setResizing] = useState(false);
  const admin = isAdmin(user);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? 'collapsed' : 'expanded');
    } catch {
      // ignore
    }
  }, [collapsed]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
    } catch {
      // ignore
    }
  }, [sidebarWidth]);

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      const next = e.clientX;
      if (next < MIN_SIDEBAR_WIDTH) {
        setSidebarWidth(MIN_SIDEBAR_WIDTH);
        return;
      }
      if (next > MAX_SIDEBAR_WIDTH) {
        setSidebarWidth(MAX_SIDEBAR_WIDTH);
        return;
      }
      setSidebarWidth(next);
    };
    const onUp = () => setResizing(false);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
    };
  }, [resizing]);

  const title = Object.entries(pageTitles).find(([path]) => location.pathname.startsWith(path))?.[1] ?? 'KnowledgeOS';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const asideWidth = collapsed ? 72 : sidebarWidth;

  return (
    <div className="min-h-screen bg-surface">
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-outline-variant/40 bg-surface-container-lowest lg:flex"
        style={{ width: asideWidth }}
      >
        <div className={cn('flex h-14 items-center gap-2 px-3', collapsed && 'justify-center px-2')}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-on-primary">
            K
          </div>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-on-surface">KnowledgeOS</p>
              <p className="text-xs text-on-surface-variant">Enterprise Knowledge Assistant</p>
            </div>
          ) : null}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={cn(
              'rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-ring',
              collapsed && 'hidden',
            )}
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-ring"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        ) : null}
        <nav className="flex flex-1 flex-col gap-1 px-2">
          {!collapsed ? (
            <p className="px-2 pb-1 pt-2 text-xs font-medium uppercase tracking-wider text-on-surface-variant">Workspace</p>
          ) : (
            <div className="h-2" />
          )}
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-lg py-1.5 text-sm transition-colors',
                  collapsed ? 'justify-center px-1.5' : 'px-2',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {!collapsed ? item.label : null}
            </NavLink>
          ))}
          {admin ? (
            <>
              {!collapsed ? (
                <p className="px-2 pb-1 pt-4 text-xs font-medium uppercase tracking-wider text-on-surface-variant">Administration</p>
              ) : (
                <div className="h-2" />
              )}
              {adminItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-lg py-1.5 text-sm transition-colors',
                      collapsed ? 'justify-center px-1.5' : 'px-2',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {!collapsed ? item.label : null}
                </NavLink>
              ))}
            </>
          ) : null}
        </nav>
        <div className="border-t border-outline-variant/40 p-2">
          {!collapsed ? (
            <div className="mb-1 flex items-center gap-2 rounded-lg px-2 py-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high text-xs font-medium text-on-surface">
                {getInitials(user?.username)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-on-surface">{user?.username}</p>
                <p className="truncate text-xs text-on-surface-variant">{user?.email}</p>
              </div>
              {admin ? (
                <span className="rounded-full bg-secondary-container/80 px-1.5 py-0.5 text-[10px] font-medium text-on-secondary-container">
                  ADMIN
                </span>
              ) : null}
            </div>
          ) : (
            <button
              onClick={() => navigate('/profile')}
              className="mb-1 flex w-full items-center justify-center rounded-lg p-1.5"
              title={user?.username}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high text-xs font-medium text-on-surface">
                {getInitials(user?.username)}
              </div>
            </button>
          )}
          <button
            onClick={handleLogout}
            title={collapsed ? 'Sign out' : undefined}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg py-1.5 text-sm text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-ring',
              collapsed ? 'justify-center px-1.5' : 'px-2',
            )}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed ? 'Sign out' : null}
          </button>
        </div>
        {!collapsed ? (
          <div
            className="absolute -right-1.5 top-0 h-full w-3 cursor-col-resize"
            onMouseDown={(e) => {
              e.preventDefault();
              setResizing(true);
            }}
          >
            <div className="mx-auto mt-16 h-12 w-1 rounded-full bg-outline-variant/40" />
          </div>
        ) : null}
      </aside>

      <div
        className="flex min-h-screen flex-col lg:pl-[var(--sidebar-w)]"
        style={{ ['--sidebar-w' as any]: `${asideWidth}px` }}
      >
        <header
          className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-outline-variant/40 bg-surface-container-lowest/90 px-3 backdrop-blur lg:left-[var(--sidebar-w)] lg:px-5"
          style={{ ['--sidebar-w' as any]: `${asideWidth}px` }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDrawerOpen(true)}
              className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-ring lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-on-surface-variant">Context</span>
              <span className="text-sm text-outline-variant">/</span>
              <span className="text-sm font-medium text-on-surface">{title}</span>
              {admin && location.pathname !== '/admin/users' ? (
                <span className="hidden rounded-full bg-secondary-container/80 px-1.5 py-0.5 text-[10px] font-medium text-on-secondary-container sm:inline-flex">
                  ADMIN
                </span>
              ) : null}
            </div>
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high text-xs font-medium text-on-surface focus-ring"
            aria-label="Profile"
          >
            {getInitials(user?.username)}
          </button>
        </header>

        <main className="flex-1 pb-16 pt-14 lg:pb-0">
          <Outlet />
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-outline-variant/40 bg-surface-container-lowest/95 backdrop-blur lg:hidden safe-bottom">
          <div className="mx-auto flex max-w-md items-center justify-around px-2 py-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex w-16 flex-col items-center gap-0.5 rounded-lg py-1 text-xs transition-colors',
                    isActive ? 'text-primary' : 'text-on-surface-variant',
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
            {admin ? (
              <>
                <NavLink
                  to="/admin/users"
                  className={({ isActive }) =>
                    cn(
                      'flex w-16 flex-col items-center gap-0.5 rounded-lg py-1 text-xs transition-colors',
                      isActive ? 'text-primary' : 'text-on-surface-variant',
                    )
                  }
                >
                  <ShieldCheck className="h-5 w-5" />
                  <span>Users</span>
                </NavLink>
                <NavLink
                  to="/admin/departments"
                  className={({ isActive }) =>
                    cn(
                      'flex w-16 flex-col items-center gap-0.5 rounded-lg py-1 text-xs transition-colors',
                      isActive ? 'text-primary' : 'text-on-surface-variant',
                    )
                  }
                >
                  <Building2 className="h-5 w-5" />
                  <span>Depts</span>
                </NavLink>
              </>
            ) : null}
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                cn(
                  'flex w-16 flex-col items-center gap-0.5 rounded-lg py-1 text-xs transition-colors',
                  isActive ? 'text-primary' : 'text-on-surface-variant',
                )
              }
            >
              <User className="h-5 w-5" />
              <span>Profile</span>
            </NavLink>
          </div>
        </nav>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[#0f172a]/40" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-surface-container-lowest shadow-modal">
            <div className="flex h-14 items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-on-primary">
                  K
                </div>
                <span className="text-sm font-semibold text-on-surface">KnowledgeOS</span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 px-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
              {admin ? (
                <>
                  <p className="px-2 pb-1 pt-4 text-xs font-medium uppercase tracking-wider text-on-surface-variant">Administration</p>
                  {adminItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setDrawerOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                        )
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </NavLink>
                  ))}
                </>
              ) : null}
              <NavLink
                to="/profile"
                onClick={() => setDrawerOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                  )
                }
              >
                <User className="h-4 w-4" />
                Profile
              </NavLink>
            </nav>
            <div className="border-t border-outline-variant/40 p-2">
              <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

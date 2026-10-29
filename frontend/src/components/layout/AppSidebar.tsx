import * as React from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { KnowledgeOSLogo } from '../brand/KnowledgeOSLogo';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { startOfDay, subDays } from 'date-fns';
import {
  Building2,
  Check,
  FileText,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { chatApi } from '../../api/chat';
import type { ChatSession } from '../../api/types';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Input } from '../ui/Input';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import { cn, getInitials } from '../../lib/utils';
import { isAdmin, canManageDocs } from '../../lib/permissions';
import { useAuthStore } from '../../stores/auth';
import { useChatActivity } from '../chat/chatActivity';

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

const workspaceItems: NavItem[] = [
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/documents', label: 'Documents', icon: FileText },
];

const adminItems: NavItem[] = [
  { to: '/admin/departments', label: 'Departments', icon: Building2 },
  { to: '/admin/users', label: 'Users', icon: ShieldCheck },
];

function groupSessions(sessions: ChatSession[]): { label: string; items: ChatSession[] }[] {
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = subDays(today, 1);
  const weekAgo = subDays(today, 7);

  const groups = [
    { label: 'Today', items: [] as ChatSession[] },
    { label: 'Yesterday', items: [] as ChatSession[] },
    { label: 'Previous 7 days', items: [] as ChatSession[] },
    { label: 'Older', items: [] as ChatSession[] },
  ];

  for (const session of sessions) {
    const value = session.updatedAt ?? session.createdAt;
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) {
      groups[3].items.push(session);
    } else if (date >= today) {
      groups[0].items.push(session);
    } else if (date >= yesterday) {
      groups[1].items.push(session);
    } else if (date >= weekAgo) {
      groups[2].items.push(session);
    } else {
      groups[3].items.push(session);
    }
  }

  return groups.filter((group) => group.items.length > 0);
}

function useDismissablePopover(open: boolean, close: () => void) {
  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-popover-root]')) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const onScroll = () => close();
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, close]);
}

function ConversationMenu({
  session,
  onRename,
  onDelete,
}: {
  session: ChatSession;
  onRename: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const close = React.useCallback(() => setOpen(false), []);
  useDismissablePopover(open, close);

  const toggle = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition({
        top: rect.bottom + 4,
        left: Math.max(8, Math.min(rect.right - 176, window.innerWidth - 184)),
      });
    }
    setOpen((value) => !value);
  };

  return (
    <div className="relative" data-popover-root>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Options for ${session.title || 'conversation'}`}
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant transition-colors focus-ring hover:bg-surface-container',
          open ? 'bg-surface-container opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
        )}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open
        ? createPortal(
            <div
              role="menu"
              data-popover-root
              style={{ position: 'fixed', top: position.top, left: position.left }}
              className="z-[70] w-44 overflow-hidden rounded-lg border border-outline-variant/60 bg-surface-container-lowest py-1 shadow-pop animate-fade-in"
            >
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setOpen(false);
                  onRename();
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-on-surface transition-colors hover:bg-surface-container focus-ring"
              >
                <Pencil className="h-3.5 w-3.5" />
                Rename
              </button>
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-danger transition-colors hover:bg-danger-soft focus-ring"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function UserMenu({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [position, setPosition] = React.useState({ bottom: 0, left: 0 });
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const close = React.useCallback(() => setOpen(false), []);
  useDismissablePopover(open, close);

  const toggle = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition({
        bottom: window.innerHeight - rect.top + 6,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 216)),
      });
    }
    setOpen((value) => !value);
  };

  const signOut = () => {
    logout();
    // Hard redirect so the in-flight chat guard cannot block signing out and all
    // in-memory state is discarded.
    window.location.assign('/login');
  };

  return (
    <div data-popover-root>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        title={collapsed ? user?.username ?? 'Account' : undefined}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg p-1.5 text-left transition-colors hover:bg-surface-container focus-ring',
          collapsed && 'justify-center',
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-xs font-semibold text-on-primary-fixed-variant">
          {getInitials(user?.username)}
        </div>
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-on-surface">{user?.username ?? 'Account'}</p>
            <p className="truncate text-xs text-on-surface-variant">{user?.email ?? ''}</p>
          </div>
        ) : null}
        {!collapsed && isAdmin(user) ? (
          <span className="rounded-full bg-secondary-container/80 px-1.5 py-0.5 text-[10px] font-medium text-on-secondary-container">
            ADMIN
          </span>
        ) : null}
      </button>
      {open
        ? createPortal(
            <div
              role="menu"
              data-popover-root
              style={{ position: 'fixed', bottom: position.bottom, left: position.left }}
              className="z-[70] w-52 overflow-hidden rounded-lg border border-outline-variant/60 bg-surface-container-lowest py-1 shadow-pop animate-fade-in"
            >
              <div className="border-b border-outline-variant/40 px-3 py-2">
                <p className="truncate text-sm font-medium text-on-surface">{user?.username}</p>
                <p className="truncate text-xs text-on-surface-variant">{user?.email}</p>
              </div>
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate('/profile');
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-on-surface transition-colors hover:bg-surface-container focus-ring"
              >
                <UserRound className="h-3.5 w-3.5" />
                Profile
              </button>
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setOpen(false);
                  signOut();
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-on-surface transition-colors hover:bg-surface-container focus-ring"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export interface AppSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobile?: boolean;
  onNavigate?: () => void;
}

export function AppSidebar({ collapsed = false, onToggleCollapse, mobile = false, onNavigate }: AppSidebarProps) {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activity, allowNextNavigation } = useChatActivity();
  const admin = isAdmin(user);
  const canManageDocuments = canManageDocs(user);

  const isChatRoute = location.pathname === '/chat' || location.pathname.startsWith('/chat/');
  const activeSessionId = React.useMemo(() => {
    const match = /^\/chat\/(\d+)$/.exec(location.pathname);
    return match ? Number(match[1]) : null;
  }, [location.pathname]);

  const sessionsQuery = useQuery({
    queryKey: ['chat', 'sessions'],
    queryFn: chatApi.listSessions,
    staleTime: 15_000,
  });

  const [renameTarget, setRenameTarget] = React.useState<ChatSession | null>(null);
  const [renameValue, setRenameValue] = React.useState('');
  const [deleteTarget, setDeleteTarget] = React.useState<ChatSession | null>(null);

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) => chatApi.renameSession(id, title),
    onSuccess: (updated) => {
      setRenameTarget(null);
      queryClient.setQueryData<ChatSession[]>(['chat', 'sessions'], (current) =>
        current?.map((item) => (item.id === updated.id ? { ...item, title: updated.title } : item)),
      );
      queryClient.invalidateQueries({ queryKey: ['chat', 'session', updated.id] });
    },
    onError: () => toast.error('Could not rename this conversation. Please try again.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => chatApi.deleteSession(id),
    onSuccess: (_result, id) => {
      setDeleteTarget(null);
      queryClient.setQueryData<ChatSession[]>(['chat', 'sessions'], (current) =>
        current?.filter((item) => item.id !== id),
      );
      queryClient.removeQueries({ queryKey: ['chat', 'session', id] });
      if (activeSessionId === id) {
        // Deleting the open conversation is deliberate: stop the stream (the server
        // must not save an answer for a deleted session) and skip the leave-guard.
        activity?.stop();
        allowNextNavigation(() =>
          navigate('/chat', { replace: true, state: { newChatAt: Date.now() } }),
        );
      }
    },
    onError: () => toast.error('Could not delete this conversation. Please try again.'),
  });

  const startNewChat = () => {
    // Navigating to the same draft while a response is streaming must not reset
    // the active turn. Elsewhere the router-level guard asks before leaving.
    if (activity?.streaming && location.pathname === '/chat') {
      toast.info('Stop the current response before starting a new chat.');
      return;
    }
    navigate('/chat', { state: { newChatAt: Date.now() } });
    onNavigate?.();
  };

  const openRename = (session: ChatSession) => {
    setRenameTarget(session);
    setRenameValue(session.title || '');
  };

  const submitRename = (event?: React.FormEvent) => {
    event?.preventDefault();
    const title = renameValue.trim();
    if (!renameTarget || !title || renameMutation.isPending) return;
    renameMutation.mutate({ id: renameTarget.id, title });
  };

  const groups = React.useMemo(() => groupSessions(sessionsQuery.data ?? []), [sessionsQuery.data]);

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        // Only exact matches highlight top-level items; /chat must not also
        // highlight while a specific conversation (/chat/:id) is open.
        end={item.to === '/chat'}
        onClick={() => onNavigate?.()}
        title={collapsed ? item.label : undefined}
        className={({ isActive }) =>
          cn(
            'group flex items-center gap-2.5 rounded-lg py-2 text-sm font-medium transition-colors focus-ring',
            collapsed ? 'justify-center px-0' : 'px-2.5',
            isActive
              ? 'bg-primary/10 text-primary'
              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
          )
        }
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {!collapsed ? <span className="truncate">{item.label}</span> : null}
      </NavLink>
    );
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-surface-container-lowest">
      <div className={cn('flex h-14 shrink-0 items-center gap-2', collapsed ? 'justify-center px-2' : 'px-3')}>
        {collapsed ? (
          <KnowledgeOSLogo variant="icon" size={32} />
        ) : (
          <KnowledgeOSLogo variant="horizontal" size={32} className="min-w-0 flex-1" />
        )}
        {!mobile && onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-ring',
              collapsed && 'hidden',
            )}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        ) : null}
        {mobile ? (
          <button
            type="button"
            onClick={onNavigate}
            aria-label="Close navigation"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-ring"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {collapsed && onToggleCollapse ? (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Expand sidebar"
          title="Expand sidebar"
          className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-ring"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      ) : null}

      <div className={cn('shrink-0 pb-2', collapsed ? 'px-2' : 'px-3')}>
        <button
          type="button"
          onClick={startNewChat}
          title={collapsed ? 'New chat' : undefined}
          aria-label={collapsed ? 'New chat' : undefined}
          className={cn(
            'group flex items-center gap-2 rounded-lg bg-[#4F46E5] py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#4338ca] hover:shadow-md focus-ring',
            collapsed ? 'w-full justify-center px-0' : 'w-full px-3',
          )}
        >
          <Plus className="h-[18px] w-[18px] shrink-0" />
          {!collapsed ? <span>New chat</span> : null}
        </button>
      </div>

      <nav aria-label="Primary" className={cn('shrink-0 space-y-0.5', collapsed ? 'px-2' : 'px-2')}>
        {workspaceItems
          .filter((item) => {
            if (item.to === '/documents') {
              return canManageDocuments || isAdmin(user);
            }
            return true;
          })
          .map(renderNavItem)}
        {admin ? (
          <>
            {!collapsed ? (
              <p className="px-2.5 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Administration
              </p>
            ) : (
              <div className="mx-auto my-2 h-px w-6 bg-outline-variant/60" />
            )}
            {adminItems.map(renderNavItem)}
          </>
        ) : null}
      </nav>

      {isChatRoute ? (
        <div className="mt-3 flex min-h-0 flex-1 flex-col">
          {!collapsed ? (
            <div className="flex items-center justify-between px-4 pb-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/70">Chats</p>
              {sessionsQuery.isFetching ? <Spinner className="h-3 w-3 text-on-surface-variant" /> : null}
            </div>
          ) : null}
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2">
            {sessionsQuery.isLoading ? (
              <div className="space-y-1.5 px-1 py-1" aria-hidden>
                {[0, 1, 2].map((index) => (
                  <div key={index} className="h-8 animate-pulse rounded-lg bg-surface-container" />
                ))}
              </div>
            ) : sessionsQuery.isError ? (
              <div className="px-3 py-4 text-center">
                <p className="text-xs text-on-surface-variant">Could not load conversations.</p>
                <button
                  type="button"
                  onClick={() => sessionsQuery.refetch()}
                  className="mt-1 text-xs font-medium text-primary hover:underline focus-ring"
                >
                  Try again
                </button>
              </div>
            ) : groups.length === 0 ? (
              !collapsed ? (
                <div className="px-3 py-6 text-center">
                  <p className="text-xs font-medium text-on-surface-variant">No conversations yet</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant/70">
                    Start a chat and it will appear here.
                  </p>
                </div>
              ) : null
            ) : (
              <div className="space-y-3">
                {groups.map((group) => (
                  <div key={group.label}>
                    {!collapsed ? (
                      <p className="px-2.5 pb-1 pt-1 text-[11px] font-medium text-on-surface-variant/70">
                        {group.label}
                      </p>
                    ) : null}
                    <ul className="space-y-0.5">
                      {group.items.map((session) => {
                        const isActive = activeSessionId === session.id;
                        const isStreamingThis = isActive && activity?.streaming;
                        return (
                          <li key={session.id}>
                            <div
                              className={cn(
                                'group relative flex items-center rounded-lg transition-colors',
                                isActive
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                              )}
                            >
                              <NavLink
                                to={`/chat/${session.id}`}
                                onClick={() => onNavigate?.()}
                                title={collapsed ? session.title || 'Conversation' : undefined}
                                className={cn(
                                  'flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1.5 text-sm transition-colors focus-ring',
                                  collapsed ? 'justify-center px-1.5' : 'pl-2.5 pr-9',
                                )}
                              >
                                {isStreamingThis ? (
                                  <span className="relative flex h-2 w-2 shrink-0">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                                  </span>
                                ) : (
                                  <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                )}
                                {!collapsed ? (
                                  <span className="truncate">{session.title || 'New chat'}</span>
                                ) : null}
                              </NavLink>
                              {!collapsed ? (
                                <div className="absolute right-1 top-1/2 -translate-y-1/2">
                                  <ConversationMenu
                                    session={session}
                                    onRename={() => openRename(session)}
                                    onDelete={() => setDeleteTarget(session)}
                                  />
                                </div>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      <div className={cn('shrink-0 border-t border-outline-variant/40 p-2', mobile && 'safe-bottom')}>
        <UserMenu collapsed={collapsed} />
      </div>

      {createPortal(
        <Modal open={Boolean(renameTarget)} onClose={() => setRenameTarget(null)} className="sm:max-w-md" sheet ariaLabel="Rename conversation">
          <form onSubmit={submitRename}>
            <ModalHeader
              title="Rename conversation"
              description="Choose a short, descriptive title."
              onClose={() => setRenameTarget(null)}
            />
            <ModalBody>
              <Input
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                maxLength={255}
                autoFocus
                aria-label="Conversation title"
                placeholder="Conversation title"
              />
            </ModalBody>
            <ModalFooter>
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container focus-ring"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!renameValue.trim() || renameMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-on-primary transition-colors hover:bg-[#4338ca] disabled:opacity-50 focus-ring"
              >
                {renameMutation.isPending ? <Check className="h-3.5 w-3.5" /> : null}
                Save
              </button>
            </ModalFooter>
          </form>
        </Modal>,
        document.body,
      )}

      {createPortal(
        <ConfirmDialog
          open={Boolean(deleteTarget)}
          title="Delete conversation?"
          description={
            <>
              <span className="font-medium text-on-surface">{deleteTarget?.title || 'This conversation'}</span> and
              all of its messages will be permanently deleted. This cannot be undone.
            </>
          }
          confirmLabel="Delete"
          destructive
          busy={deleteMutation.isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
          }}
        />,
        document.body,
      )}
    </div>
  );
}

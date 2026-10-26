import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, Check, ChevronDown, Mail, Search, Shield, UserRound } from 'lucide-react';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { departmentsApi } from '../api/departments';
import { usersApi } from '../api/users';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import { cn } from '../lib/utils';
import { useAuthStore } from '../stores/auth';
import { toast } from 'sonner';
import type { UserRole } from '../api/types';

const roles: UserRole[] = ['USER', 'KNOWLEDGE_MANAGER'];

const roleLabels: Record<UserRole, string> = {
  USER: 'User',
  KNOWLEDGE_MANAGER: 'Knowledge Manager',
  ADMIN: 'Admin',
};

export default function EditUserPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [form, setForm] = React.useState({
    username: '',
    email: '',
    userRole: 'USER' as UserRole,
    departmentIds: [] as number[],
  });
  const [deptOpen, setDeptOpen] = React.useState(false);
  const [deptSearch, setDeptSearch] = React.useState('');
  const [roleOpen, setRoleOpen] = React.useState(false);

  const deptTriggerRef = React.useRef<HTMLButtonElement>(null);
  const deptMenuRef = React.useRef<HTMLDivElement>(null);
  const [deptPos, setDeptPos] = React.useState({ top: 0, left: 0, width: 0, flip: false });

  const roleTriggerRef = React.useRef<HTMLButtonElement>(null);
  const roleMenuRef = React.useRef<HTMLDivElement>(null);
  const [rolePos, setRolePos] = React.useState({ top: 0, left: 0, width: 0, flip: false });

  const userQuery = useQuery({
    queryKey: ['admin', 'user', userId],
    queryFn: () => usersApi.get(Number(userId)),
    enabled: Boolean(userId),
  });

  const departmentsQuery = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list(),
  });

  React.useEffect(() => {
    if (userQuery.data) {
      const u: any = userQuery.data;
      let deptIds: number[] = [];
      if (u.departmentIds) {
        const ids = u.departmentIds;
        deptIds = Array.isArray(ids) ? ids.map((x: any) => Number(x)) : Array.from(ids).map((x: any) => Number(x));
      } else if (u.departments) {
        if (Array.isArray(u.departments) && typeof u.departments[0] === 'object') {
          deptIds = u.departments.map((d: any) => Number(d.id)).filter(Boolean);
        } else {
          deptIds = u.departments.map((x: any) => Number(x)).filter(Boolean);
        }
      }
      setForm({
        username: u.username || '',
        email: u.email || '',
        userRole: u.userRole || 'USER',
        departmentIds: deptIds.filter(Boolean),
      });
    }
  }, [userQuery.data]);

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!userId) throw new Error('No user selected');
      return usersApi.update(Number(userId), {
        username: form.username.trim(),
        email: form.email.trim(),
        userRole: form.userRole,
        departmentIds: form.departmentIds.length ? form.departmentIds : [],
      });
    },
    onSuccess: () => {
      toast.success('User updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', userId] });
      navigate('/admin/users');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to update user');
    },
  });

  const departments = departmentsQuery.data ?? [];
  const filteredDepts = departments.filter((d: any) => {
    if (!deptSearch.trim()) return true;
    return d.name.toLowerCase().includes(deptSearch.toLowerCase());
  });
  const selectedDepts = departments.filter((d: any) => form.departmentIds.includes(d.id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (updateMutation.isPending) return;
    updateMutation.mutate();
  };

  const toggleDept = (deptId: number) => {
    setForm((f) => {
      if (f.departmentIds.includes(deptId)) {
        return { ...f, departmentIds: f.departmentIds.filter((id) => id !== deptId) };
      }
      return { ...f, departmentIds: [...f.departmentIds, deptId] };
    });
  };

  const updateDeptPosition = React.useCallback(() => {
    if (!deptTriggerRef.current) return;
    const rect = deptTriggerRef.current.getBoundingClientRect();
    const menuHeight = 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const flip = spaceBelow < menuHeight && rect.top > menuHeight;
    setDeptPos({
      top: flip ? rect.top + window.scrollY - menuHeight : rect.bottom + window.scrollY + 6,
      left: rect.left + window.scrollX,
      width: rect.width,
      flip,
    });
  }, []);

  const updateRolePosition = React.useCallback(() => {
    if (!roleTriggerRef.current) return;
    const rect = roleTriggerRef.current.getBoundingClientRect();
    const menuHeight = 200;
    const spaceBelow = window.innerHeight - rect.bottom;
    const flip = spaceBelow < menuHeight && rect.top > menuHeight;
    setRolePos({
      top: flip ? rect.top + window.scrollY - menuHeight : rect.bottom + window.scrollY + 6,
      left: rect.left + window.scrollX,
      width: rect.width,
      flip,
    });
  }, []);

  React.useEffect(() => {
    if (!deptOpen) return;
    updateDeptPosition();
    const onResize = () => updateDeptPosition();
    const onScroll = () => updateDeptPosition();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [deptOpen, updateDeptPosition]);

  React.useEffect(() => {
    if (!roleOpen) return;
    updateRolePosition();
    const onResize = () => updateRolePosition();
    const onScroll = () => updateRolePosition();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [roleOpen, updateRolePosition]);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (deptOpen && deptTriggerRef.current && deptMenuRef.current) {
        if (!deptTriggerRef.current.contains(e.target as Node) && !deptMenuRef.current.contains(e.target as Node)) {
          setDeptOpen(false);
        }
      }
      if (roleOpen && roleTriggerRef.current && roleMenuRef.current) {
        if (!roleTriggerRef.current.contains(e.target as Node) && !roleMenuRef.current.contains(e.target as Node)) {
          setRoleOpen(false);
        }
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDeptOpen(false);
        setRoleOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [deptOpen, roleOpen]);

  const isSelf = currentUser && userQuery.data && (currentUser as any).id === (userQuery.data as any).id;

  if (userQuery.isLoading) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-3 px-4 py-12">
        <Spinner />
        <p className="text-sm text-on-surface-variant">Loading user details...</p>
      </div>
    );
  }

  if (userQuery.isError || !userQuery.data) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-4 px-4 py-12">
        <div className="text-center">
          <p className="text-lg font-medium text-on-surface">User not found</p>
          <p className="mt-1 text-sm text-on-surface-variant">The user you're looking for doesn't exist or you don't have access.</p>
        </div>
        <Button onClick={() => navigate('/admin/users')}>
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-4">
        <nav className="flex items-center gap-1.5 text-xs text-on-surface-variant">
          <button onClick={() => navigate('/admin/users')} className="hover:text-on-surface transition-colors">
            Users
          </button>
          <span>/</span>
          <span className="text-[#5145E5]">Edit User</span>
        </nav>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-on-surface">Edit User</h1>
            <p className="mt-1 text-sm text-on-surface-variant">Update role and department assignments.</p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/admin/users')} className="h-[44px]">
            <ArrowLeft className="h-4 w-4" />
            Back to Users
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="overflow-hidden rounded-2xl border border-outline-variant/50 bg-white shadow-[0_1px_1px_rgba(15,23,42,0.02),0_10px_40px_rgba(81,69,229,0.05)]">
          <div className="flex items-center gap-3 border-b border-outline-variant/40 bg-gradient-to-r from-[#f8f9fc] to-white px-6 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#eae7ff] to-[#e7f0ff]">
              <UserRound className="h-4 w-4 text-[#5145E5]" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-on-surface">User Information</h2>
              <p className="text-xs text-on-surface-variant">Account details for this user (read-only).</p>
            </div>
          </div>
          <div className="grid gap-5 px-6 py-6 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-xs font-medium text-on-surface">Username</label>
              <Input value={form.username} disabled className="h-[46px] bg-surface-container-low text-on-surface-variant" />
            </div>
            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-xs font-medium text-on-surface">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                <Input type="email" value={form.email} disabled className="h-[46px] pl-9 bg-surface-container-low text-on-surface-variant" />
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-outline-variant/50 bg-white shadow-[0_1px_1px_rgba(15,23,42,0.02),0_10px_40px_rgba(81,69,229,0.05)]">
          <div className="flex items-center gap-3 border-b border-outline-variant/40 bg-gradient-to-r from-[#f8f9fc] to-white px-6 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#eae7ff] to-[#e7f0ff]">
              <Shield className="h-4 w-4 text-[#5145E5]" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-on-surface">Organization & Access</h2>
              <p className="text-xs text-on-surface-variant">Manage role and department assignments.</p>
            </div>
          </div>
          <div className="grid gap-5 px-6 py-6">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-on-surface">Role</label>
              <div className="relative">
                <button
                  ref={roleTriggerRef}
                  type="button"
                  onClick={() => {
                    if (isSelf) return;
                    setRoleOpen((o) => !o);
                    setDeptOpen(false);
                  }}
                  disabled={Boolean(isSelf) || updateMutation.isPending}
                  className={cn(
                    'flex h-[46px] w-full items-center justify-between rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-3 text-sm text-on-surface shadow-sm transition-all hover:border-[#5145E5]/40 focus:border-[#5145E5] focus:outline-none focus:ring-2 focus:ring-[#5145E5]/10',
                    isSelf && 'cursor-not-allowed opacity-60',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-[#5145E5]" />
                    <span>{roleLabels[form.userRole] || form.userRole}</span>
                  </div>
                  <ChevronDown className={cn('h-4 w-4 text-on-surface-variant transition-transform', roleOpen && 'rotate-180')} />
                </button>
                {roleOpen && !isSelf && createPortal(
                  <div
                    ref={roleMenuRef}
                    style={{ position: 'absolute', top: rolePos.top, left: rolePos.left, width: rolePos.width, zIndex: 9999 }}
                    className="overflow-hidden rounded-2xl border border-outline-variant/70 bg-white shadow-[0_20px_60px_rgba(81,69,229,0.18)]"
                    role="listbox"
                  >
                    <div className="max-h-[200px] overflow-y-auto overscroll-contain p-1.5">
                      {roles.map((r) => {
                        const selected = form.userRole === r;
                        return (
                          <button
                            key={r}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() => {
                              setForm((f) => ({ ...f, userRole: r }));
                              setRoleOpen(false);
                            }}
                            className={cn(
                              'flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-surface-container-low',
                              selected && 'bg-gradient-to-r from-[#eae7ff]/70 to-transparent',
                            )}
                          >
                            <span className="text-on-surface">{roleLabels[r] || r}</span>
                            {selected ? <Check className="h-4 w-4 text-[#5145E5]" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>,
                  document.body,
                )}
              </div>
              {isSelf ? <p className="text-xs text-on-surface-variant">You cannot change your own role.</p> : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-on-surface">Departments</label>
              <div className="relative">
                <button
                  ref={deptTriggerRef}
                  type="button"
                  onClick={() => {
                    setDeptOpen((o) => !o);
                    setRoleOpen(false);
                    if (!deptOpen) setDeptSearch('');
                  }}
                  className="flex h-[46px] w-full items-center justify-between rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-3 text-sm text-on-surface shadow-sm transition-all hover:border-[#5145E5]/40 hover:shadow-[0_1px_1px_rgba(15,23,42,0.01)] focus:border-[#5145E5] focus:outline-none focus:ring-2 focus:ring-[#5145E5]/10"
                >
                  <div className="flex flex-1 items-center gap-2 overflow-hidden">
                    <Building2 className="h-4 w-4 flex-shrink-0 text-[#5145E5]" />
                    {selectedDepts.length === 0 ? (
                      <span className="text-on-surface-variant">Select departments</span>
                    ) : (
                      <span className="truncate text-on-surface">
                        {selectedDepts.map((d: any) => d.name).join(', ')}
                      </span>
                    )}
                  </div>
                  <ChevronDown className={cn('h-4 w-4 flex-shrink-0 text-on-surface-variant transition-transform', deptOpen && 'rotate-180')} />
                </button>
                {deptOpen && createPortal(
                  <div
                    ref={deptMenuRef}
                    style={{ position: 'absolute', top: deptPos.top, left: deptPos.left, width: deptPos.width, zIndex: 9999 }}
                    className="overflow-hidden rounded-2xl border border-outline-variant/70 bg-white shadow-[0_20px_60px_rgba(81,69,229,0.22)]"
                  >
                    <div className="border-b border-outline-variant/40 bg-gradient-to-r from-[#f8f9fc] to-white p-2.5">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                        <Input
                          value={deptSearch}
                          onChange={(e) => setDeptSearch(e.target.value)}
                          placeholder="Search departments..."
                          className="h-[40px] pl-8"
                        />
                      </div>
                    </div>
                    <div className="max-h-[260px] overflow-y-auto overscroll-contain p-1.5">
                      {departmentsQuery.isLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <Spinner />
                        </div>
                      ) : filteredDepts.length === 0 ? (
                        <p className="px-2 py-4 text-center text-xs text-on-surface-variant">No departments found</p>
                      ) : (
                        filteredDepts.map((d: any) => {
                          const selected = form.departmentIds.includes(d.id);
                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => toggleDept(d.id)}
                              className={cn(
                                'flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-surface-container-low',
                                selected && 'bg-gradient-to-r from-[#eae7ff]/70 to-transparent',
                              )}
                            >
                              <span className="text-on-surface">{d.name}</span>
                              {selected ? <Check className="h-4 w-4 text-[#5145E5]" /> : null}
                            </button>
                          );
                        })
                      )}
                    </div>
                    <div className="flex items-center justify-between border-t border-outline-variant/40 bg-surface-container-low/50 px-3 py-2">
                      <span className="text-xs text-on-surface-variant">{form.departmentIds.length} selected</span>
                      <Button size="sm" variant="ghost" onClick={() => setDeptOpen(false)} className="h-[32px]">
                        Done
                      </Button>
                    </div>
                  </div>,
                  document.body,
                )}
              </div>
              <p className="text-xs text-on-surface-variant">Click to select or deselect multiple departments.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => navigate('/admin/users')} disabled={updateMutation.isPending} className="h-[46px]">
            Cancel
          </Button>
          <Button type="submit" disabled={updateMutation.isPending || userQuery.isLoading} className="h-[46px] bg-gradient-to-r from-[#5145E5] to-[#6d5efc] shadow-card">
            {updateMutation.isPending ? <Spinner className="text-on-primary" /> : null}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}

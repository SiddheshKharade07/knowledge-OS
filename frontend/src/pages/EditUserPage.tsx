import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Mail, Shield, UserRound } from 'lucide-react';
import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { departmentsApi } from '../api/departments';
import { usersApi } from '../api/users';
import { Button } from '../components/ui/Button';
import { Dropdown } from '../components/ui/Dropdown';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (updateMutation.isPending) return;
    updateMutation.mutate();
  };

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
              <div className="relative">
                <Dropdown
                  mode="single"
                  label="Role"
                  options={roles.map((r) => ({ value: r, label: roleLabels[r] || r }))}
                  value={form.userRole}
                  onChange={(value) => setForm((f) => ({ ...f, userRole: value as UserRole }))}
                  searchable={false}
                  disabled={Boolean(isSelf) || updateMutation.isPending}
                  className="w-full"
                />
              </div>
              {isSelf ? <p className="text-xs text-on-surface-variant">You cannot change your own role.</p> : null}
            </div>

            <div className="space-y-1.5">
              <div className="relative">
                <Dropdown
                  mode="multi"
                  label="Departments"
                  placeholder="Select departments"
                  options={departments.map((d: any) => ({ value: d.id, label: d.name }))}
                  value={form.departmentIds}
                  onChange={(value) => setForm((f) => ({ ...f, departmentIds: value.map((v) => Number(v)).filter(Boolean) }))}
                  searchable={departments.length > 6}
                  clearable
                  loading={departmentsQuery.isLoading}
                  loadingText="Loading departments..."
                  emptyText="No departments available."
                  className="w-full"
                />
              </div>
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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Search, ShieldAlert, Trash2, UserRound } from 'lucide-react';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../api/users';
import { departmentsApi } from '../api/departments';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Dropdown } from '../components/ui/Dropdown';
import { Input } from '../components/ui/Input';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { cn, getInitials } from '../lib/utils';
import { useAuthStore } from '../stores/auth';
import { toast } from 'sonner';
import type { UserRole, UserSummary } from '../api/types';

const roles: UserRole[] = ['USER', 'KNOWLEDGE_MANAGER'];

export default function AdminUsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = React.useState('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<(UserSummary & { departmentIds?: number[] | null }) | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<UserSummary | null>(null);
  const [form, setForm] = React.useState({
    username: '',
    email: '',
    userRole: 'USER' as UserRole,
    departmentIds: [] as number[],
  });

  const usersQuery = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => usersApi.list(0, 50),
  });

  const departmentsQuery = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: () => usersApi.create({ ...form, departmentIds: form.departmentIds.length ? form.departmentIds : undefined }),
    onSuccess: () => {
      toast.success('User invited. A password setup email was sent.');
      setCreateOpen(false);
      setForm({ username: '', email: '', userRole: 'USER', departmentIds: [] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create user'),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingUser) throw new Error('No user selected');
      return usersApi.update(editingUser.id, {
        username: form.username,
        email: form.email,
        userRole: form.userRole,
        departmentIds: form.departmentIds.length ? form.departmentIds : [],
      });
    },
    onSuccess: () => {
      toast.success('User updated');
      setEditOpen(false);
      setEditingUser(null);
      setForm({ username: '', email: '', userRole: 'USER', departmentIds: [] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update user'),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, userRole }: { id: number; userRole: UserRole }) => usersApi.changeRole(id, { userRole }),
    onSuccess: () => {
      toast.success('Role updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update role'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => usersApi.changeStatus(id, { active }),
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update status'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => usersApi.delete(id),
    onSuccess: () => {
      toast.success('User deleted');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to delete user'),
  });

  const users: (UserSummary & { departmentIds?: number[] | null })[] = (usersQuery.data?.content as any) ?? [];
  const departments = departmentsQuery.data ?? [];
  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const isSelf = (u: UserSummary) => currentUser?.id === u.id;

  const getDepartmentNames = (deptIds?: number[] | any[] | null) => {
    if (!deptIds || (Array.isArray(deptIds) && deptIds.length === 0)) return '—';
    if (Array.isArray(deptIds) && deptIds.length > 0 && typeof deptIds[0] === 'object') {
      const names = deptIds.map((d: any) => d?.name).filter(Boolean);
      return names.length ? names.join(', ') : '—';
    }
    const ids = Array.isArray(deptIds) ? deptIds : Array.from(deptIds as any);
    const names = ids.map((id: any) => departments.find((d) => d.id === Number(id))?.name).filter(Boolean);
    return names.length ? names.join(', ') : '—';
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm({ username: '', email: '', userRole: 'USER', departmentIds: [] });
    setCreateOpen(true);
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
            <span>Admin Console</span>
            <span>/</span>
            <span className="text-[#5145E5]">Access Control</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-on-surface">Users</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Manage organization credentials and permission tiers.</p>
        </div>
        <Button onClick={openCreate} className="h-[46px] bg-gradient-to-r from-[#5145E5] to-[#6d5efc] shadow-card">
          <Plus className="h-4 w-4" />
          Create user
        </Button>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-outline-variant/50 bg-gradient-to-r from-[#fef2f2] to-white px-4 py-3 shadow-[0_1px_1px_rgba(15,23,42,0.01)]">
        <ShieldAlert className="mt-0.5 h-4 w-4 text-danger" />
        <div>
          <p className="text-sm font-medium text-on-error-container">Policy enforcement active</p>
          <p className="text-sm text-on-error-container/80">Self-modification and creating administrators are disabled by backend safeguards.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-outline-variant/50 bg-white px-3 shadow-[0_1px_1px_rgba(15,23,42,0.02),0_10px_40px_rgba(81,69,229,0.04)]">
        <Search className="h-4 w-4 text-on-surface-variant" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by username or email..."
          className="border-0 bg-transparent shadow-none focus:ring-0"
        />
      </div>

      <div className="flex flex-col gap-2">
        {usersQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-outline-variant/50 bg-surface-container-lowest py-12 text-center shadow-card">
            <UserRound className="mb-2 h-8 w-8 text-on-surface-variant/60" />
            <p className="text-sm text-on-surface">No users found</p>
          </div>
        ) : (
          filtered.map((u) => (
            <div
              key={u.id}
              className="flex flex-col gap-3 rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high text-sm font-medium text-on-surface">
                  {getInitials(u.username)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-on-surface">{u.username}</p>
                    {isSelf(u) ? (
                      <span className="rounded bg-primary-fixed px-1.5 py-0.5 text-[10px] font-medium text-on-primary-fixed">
                        YOU
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-on-surface-variant">{u.email}</p>
                  <p className="text-xs text-on-surface-variant">
                Dept: {getDepartmentNames((u as any).departmentIds || (u as any).departments || (u as any).userDepartments)}
              </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    u.userRole === 'ADMIN'
                      ? 'bg-primary-fixed text-on-primary-fixed'
                      : u.userRole === 'KNOWLEDGE_MANAGER'
                      ? 'bg-secondary-container text-on-secondary-container'
                      : 'bg-surface-container text-on-surface-variant',
                  )}
                >
                  {u.userRole}
                </span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    u.active ? 'bg-success-soft text-success' : 'bg-surface-container text-on-surface-variant',
                  )}
                >
                  {u.active ? 'Active' : 'Inactive'}
                </span>
                {!isSelf(u) && u.userRole !== 'ADMIN' ? (
                  <>
                    <select
                      value={u.userRole}
                      onChange={(e) => roleMutation.mutate({ id: u.id, userRole: e.target.value as UserRole })}
                      className="h-[42px] max-w-[160px] rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-2.5 text-sm text-on-surface"
                      disabled={roleMutation.isPending}
                    >
                      {roles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-[38px]"
                      onClick={() => navigate(`/admin/users/${u.id}/edit`)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-[38px]"
                      onClick={() => statusMutation.mutate({ id: u.id, active: !u.active })}
                      disabled={statusMutation.isPending}
                    >
                      {u.active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-[38px]"
                      onClick={() => {
                        setDeleteTarget(u);
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)}>
        <ModalHeader title="Create user" description="An invite email with a password setup link will be sent." onClose={() => setCreateOpen(false)} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
        >
          <ModalBody className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-on-surface">Username</label>
              <Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} required className="h-[46px]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-on-surface">Email</label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required className="h-[46px]" />
            </div>
            <div className="space-y-1.5">
              <Dropdown
                mode="single"
                label="Role"
                options={roles.map((r) => ({ value: r, label: r }))}
                value={form.userRole}
                onChange={(value) => setForm((f) => ({ ...f, userRole: value as UserRole }))}
                searchable={false}
              />
              <p className="text-xs text-on-surface-variant">Creating ADMIN accounts is not permitted.</p>
            </div>
            <div className="space-y-1.5">
              <Dropdown
                mode="multi"
                label="Departments"
                placeholder="Select departments"
                options={departments.map((d) => ({ value: d.id, label: d.name }))}
                value={form.departmentIds}
                onChange={(value) => setForm((f) => ({ ...f, departmentIds: value.map((v) => Number(v)).filter(Boolean) }))}
                searchable={departments.length > 6}
                clearable
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending} className="h-[46px]">
              {createMutation.isPending ? <Spinner className="text-on-primary" /> : null}
              Create and invite
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)}>
        <ModalHeader title="Edit user" description="Update user details and department assignment." onClose={() => setEditOpen(false)} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate();
          }}
        >
          <ModalBody className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-on-surface">Username</label>
              <Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} required className="h-[46px]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-on-surface">Email</label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required className="h-[46px]" />
            </div>
            <div className="space-y-1.5">
              <Dropdown
                mode="single"
                label="Role"
                options={roles.map((r) => ({ value: r, label: r }))}
                value={form.userRole}
                onChange={(value) => setForm((f) => ({ ...f, userRole: value as UserRole }))}
                searchable={false}
                disabled={editingUser?.id === currentUser?.id}
              />
              {editingUser?.id === currentUser?.id ? (
                <p className="text-xs text-on-surface-variant">You cannot change your own role.</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Dropdown
                mode="multi"
                label="Departments"
                placeholder="Select departments"
                options={departments.map((d) => ({ value: d.id, label: d.name }))}
                value={form.departmentIds}
                onChange={(value) => setForm((f) => ({ ...f, departmentIds: value.map((v) => Number(v)).filter(Boolean) }))}
                searchable={departments.length > 6}
                clearable
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setEditOpen(false)} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending} className="h-[46px]">
              {updateMutation.isPending ? <Spinner className="text-on-primary" /> : null}
              Save changes
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete user?"
        description={
          <>
            Are you sure you want to delete{' '}
            <span className="font-medium text-on-surface">{deleteTarget?.username || deleteTarget?.email}</span>?
            This action cannot be undone.
          </>
        }
        confirmLabel="Delete user"
        destructive
        busy={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}

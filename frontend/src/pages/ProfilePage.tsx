import { useMutation } from '@tanstack/react-query';
import { KeyRound, LogOut } from 'lucide-react';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import { getInitials } from '../lib/utils';
import { useAuthStore } from '../stores/auth';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = React.useState({ currentPassword: '', newPassword: '', confirm: '' });

  const changeMutation = useMutation({
    mutationFn: () => authApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
    onSuccess: (res) => {
      toast.success(res.message || 'Password changed');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to change password'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword.length < 5 || form.newPassword.length > 20) {
      toast.error('Password must be between 5 and 20 characters.');
      return;
    }
    if (form.newPassword !== form.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    changeMutation.mutate();
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold text-on-surface">Profile</h1>
        <p className="text-sm text-on-surface-variant">Account details and security settings.</p>
      </div>

      <div className="flex items-center gap-4 rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-5 shadow-card">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-high text-base font-medium text-on-surface">
          {getInitials(user?.username)}
        </div>
        <div className="min-w-0">
          <p className="text-base font-medium text-on-surface">{user?.username}</p>
          <p className="text-sm text-on-surface-variant">{user?.email}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-on-surface-variant">
            <span className="rounded-full bg-surface-container px-2 py-0.5">{user?.userRole}</span>
            <span className={user?.active ? 'text-success' : 'text-on-surface-variant'}>{user?.active ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-outline-variant/50 bg-surface-container-lowest shadow-card">
        <div className="border-b border-outline-variant/40 px-5 py-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-on-surface-variant" />
            <h2 className="text-sm font-medium text-on-surface">Change password</h2>
          </div>
          <p className="mt-1 text-sm text-on-surface-variant">Update your password with your current credentials.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-on-surface">Current password</label>
            <Input type="password" value={form.currentPassword} onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-on-surface">New password</label>
              <Input type="password" value={form.newPassword} onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))} required minLength={5} maxLength={20} />
              <p className="text-xs text-on-surface-variant">5-20 characters</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-on-surface">Confirm new password</label>
              <Input type="password" value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} required />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={changeMutation.isPending}>
              {changeMutation.isPending ? <Spinner className="text-on-primary" /> : null}
              Update password
            </Button>
          </div>
        </form>
      </div>

      <div className="flex justify-end">
        <Button variant="secondary" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}

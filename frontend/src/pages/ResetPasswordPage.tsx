import { useMutation } from '@tanstack/react-query';
import * as React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: () => authApi.resetPassword({ token, newPassword: password }),
    onSuccess: (res) => {
      toast.success(res.message || 'Password reset. You can now sign in.');
      navigate('/login', { replace: true });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to reset password');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('Invalid or missing token');
      return;
    }
    if (password.length < 12) {
      toast.error('Password must be at least 12 characters');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-outline-variant/50 bg-surface-container-lowest shadow-card">
        <div className="px-6 pb-4 pt-6">
          <h1 className="text-xl font-semibold text-on-surface">Reset your password</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Choose a new password for your account.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-on-surface">New password</label>
            <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="text-xs text-on-surface-variant">12-72 characters</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-on-surface">Confirm password</label>
            <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={mutation.isPending || !token}>
            {mutation.isPending ? <Spinner className="text-on-primary" /> : null}
            Reset password
          </Button>
          <div className="text-center">
            <Link to="/login" className="text-sm text-primary hover:underline">
              Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

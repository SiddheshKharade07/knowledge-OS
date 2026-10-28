import { useMutation } from '@tanstack/react-query';
import * as React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  getPasswordLengthError,
} from '../lib/passwordPolicy';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [passwordTouched, setPasswordTouched] = React.useState(false);
  const [confirmTouched, setConfirmTouched] = React.useState(false);
  const navigate = useNavigate();

  const passwordLengthError = getPasswordLengthError(password);
  const confirmError = (confirmTouched || confirm.length > 0) && confirm !== password
    ? 'Passwords do not match.'
    : null;
  const canSubmit = Boolean(token) && !passwordLengthError && password === confirm;

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
    setPasswordTouched(true);
    setConfirmTouched(true);
    if (!token) {
      toast.error('Invalid or missing token');
      return;
    }
    if (passwordLengthError) {
      toast.error(passwordLengthError);
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    mutation.mutate();
  };

  const showPasswordError = passwordTouched && passwordLengthError;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-outline-variant/50 bg-surface-container-lowest shadow-card">
        <div className="px-6 pb-4 pt-6">
          <h1 className="text-xl font-semibold text-on-surface">Reset your password</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Choose a new password for your account.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6">
          <div className="space-y-1.5">
            <label htmlFor="new-password" className="text-xs font-medium text-on-surface">New password</label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordTouched(true);
              }}
              onBlur={() => setPasswordTouched(true)}
              maxLength={MAX_PASSWORD_LENGTH}
              aria-invalid={showPasswordError ? true : undefined}
              aria-describedby={showPasswordError ? 'new-password-hint new-password-error' : 'new-password-hint'}
              className={showPasswordError ? 'border-error focus:border-error focus:ring-error/20' : undefined}
            />
            <p id="new-password-hint" className="text-xs text-on-surface-variant">
              {MIN_PASSWORD_LENGTH}-{MAX_PASSWORD_LENGTH} characters
            </p>
            {showPasswordError ? (
              <p id="new-password-error" role="alert" className="text-xs text-error">
                {passwordLengthError}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirm-password" className="text-xs font-medium text-on-surface">Confirm password</label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setConfirmTouched(true);
              }}
              onBlur={() => setConfirmTouched(true)}
              maxLength={MAX_PASSWORD_LENGTH}
              aria-invalid={confirmError ? true : undefined}
              aria-describedby={confirmError ? 'confirm-password-error' : undefined}
              className={confirmError ? 'border-error focus:border-error focus:ring-error/20' : undefined}
            />
            {confirmError ? (
              <p id="confirm-password-error" role="alert" className="text-xs text-error">
                {confirmError}
              </p>
            ) : null}
          </div>
          <Button type="submit" className="w-full" disabled={mutation.isPending || !canSubmit}>
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

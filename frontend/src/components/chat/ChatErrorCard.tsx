import { AlertTriangle, LogIn, RotateCcw, X } from 'lucide-react';
import { Button } from '../ui/Button';
import type { ChatFailure } from '../../lib/errors';

function titleFor(failure: ChatFailure): string {
  if (failure.code === 'auth') return 'Session expired';
  if (failure.code === 'forbidden') return 'Access denied';
  if (failure.code === 'session_not_found' || failure.code === 'not_found') return 'Conversation unavailable';
  if (failure.code === 'stopped') return 'Generation stopped';
  if (failure.code === 'interrupted') return 'Response interrupted';
  if (failure.phase === 'pre-stream') return 'Your message could not be sent';
  return 'Response could not be completed';
}

export function ChatErrorCard({
  failure,
  partial,
  onRetry,
  onDismiss,
  onSignIn,
}: {
  failure: ChatFailure;
  partial?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
  onSignIn?: () => void;
}) {
  const title = titleFor(failure);
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-xl border border-error/25 bg-error-container/40 px-3.5 py-3 text-on-error-container shadow-card animate-fade-in-up"
    >
      <div className="flex gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-sm leading-relaxed text-on-error-container/90">{failure.message}</p>
          {partial ? (
            <p className="mt-1 text-xs font-medium text-on-error-container/80">
              The response above is incomplete and was not saved as a final answer.
            </p>
          ) : null}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {failure.retryable && onRetry ? (
              <Button size="sm" variant="secondary" onClick={onRetry}>
                <RotateCcw className="h-3.5 w-3.5" />
                Retry
              </Button>
            ) : null}
            {failure.code === 'auth' && onSignIn ? (
              <Button size="sm" variant="secondary" onClick={onSignIn}>
                <LogIn className="h-3.5 w-3.5" />
                Sign in again
              </Button>
            ) : null}
            {onDismiss ? (
              <Button size="sm" variant="ghost" onClick={onDismiss}>
                <X className="h-3.5 w-3.5" />
                Dismiss
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

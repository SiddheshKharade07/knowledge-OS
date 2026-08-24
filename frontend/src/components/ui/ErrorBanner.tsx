import { AlertCircle, RotateCcw } from 'lucide-react';

interface ErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ title = 'Something went wrong', message, onRetry }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
        <div>
          <p className="text-sm font-semibold text-rose-200">{title}</p>
          <p className="mt-0.5 text-sm text-rose-200/80">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary shrink-0 !border-rose-300/30 !bg-rose-500/10 !text-rose-200 hover:!bg-rose-500/20">
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          Retry
        </button>
      )}
    </div>
  );
}

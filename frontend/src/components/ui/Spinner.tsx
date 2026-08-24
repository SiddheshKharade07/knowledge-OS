import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

interface SpinnerProps {
  className?: string;
  label?: string;
}

export function Spinner({ className, label }: SpinnerProps) {
  return (
    <span role="status" aria-label={label ?? 'Loading'} className="inline-flex items-center gap-2">
      <Loader2 aria-hidden="true" className={cn('h-4 w-4 animate-spin text-indigo-300', className)} />
      {label && <span className="text-sm text-slate-400">{label}</span>}
    </span>
  );
}

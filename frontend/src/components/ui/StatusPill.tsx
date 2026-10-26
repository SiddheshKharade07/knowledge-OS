import { cn } from '../../lib/utils';
import type { DocumentStatus } from '../../api/types';

const styles: Record<DocumentStatus, string> = {
  COMPLETED: 'bg-success-soft text-success',
  PROCESSING: 'bg-info-soft text-info',
  UPLOADED: 'bg-surface-container-high text-on-surface-variant',
  FAILED: 'bg-danger-soft text-danger',
};

const labels: Record<DocumentStatus, string> = {
  COMPLETED: 'Completed',
  PROCESSING: 'Processing',
  UPLOADED: 'Uploaded',
  FAILED: 'Failed',
};

export function StatusPill({ status }: { status: DocumentStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        styles[status],
      )}
    >
      {status === 'PROCESSING' && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-info" />
      )}
      {labels[status]}
    </span>
  );
}

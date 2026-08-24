import { AlertTriangle, CheckCircle2, FileUp, Loader2 } from 'lucide-react';
import type { DocumentStatus } from '../../api/types';
import { cn } from '../../lib/cn';

const STATUS_META: Record<
  DocumentStatus,
  { label: string; icon: typeof CheckCircle2; classes: string; description: string }
> = {
  UPLOADED: {
    label: 'Uploaded',
    icon: FileUp,
    classes: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    description: 'Stored but not yet indexed',
  },
  PROCESSING: {
    label: 'Processing',
    icon: Loader2,
    classes: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
    description: 'Ingestion in progress',
  },
  COMPLETED: {
    label: 'Completed',
    icon: CheckCircle2,
    classes: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
    description: 'Indexed and searchable',
  },
  FAILED: {
    label: 'Failed',
    icon: AlertTriangle,
    classes: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
    description: 'Ingestion failed — retry available',
  },
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.UPLOADED;
  const Icon = meta.icon;
  return (
    <span
      title={meta.description}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium',
        meta.classes,
      )}
    >
      <Icon aria-hidden="true" className={cn('h-3.5 w-3.5', status === 'PROCESSING' && 'animate-spin')} />
      {meta.label}
      <span className="sr-only">status: {status}</span>
    </span>
  );
}

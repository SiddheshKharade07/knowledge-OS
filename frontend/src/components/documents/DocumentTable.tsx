import { Link } from 'react-router-dom';
import { Eye, FileSearch } from 'lucide-react';
import type { DocumentResponse } from '../../api/types';
import { formatBytes, formatDateTime, truncateMiddle } from '../../lib/format';
import { StatusBadge } from '../ui/StatusBadge';
import { Skeleton } from '../ui/Skeleton';
import { Spinner } from '../ui/Spinner';

interface DocumentTableProps {
  documents: DocumentResponse[];
  isLoading: boolean;
  pendingIngestId?: number;
  onIngest: (id: number) => void;
}

export function DocumentTable({ documents, isLoading, pendingIngestId, onIngest }: DocumentTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2" aria-label="Loading documents">
        {[0, 1, 2].map((row) => (
          <div key={row} className="panel flex items-center gap-4 p-4">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="ml-auto h-5 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <ul role="list" className="space-y-2" aria-label="Documents">
      {documents.map((doc) => {
        const ingestable = doc.documentStatus === 'UPLOADED' || doc.documentStatus === 'FAILED';
        const isIngesting = pendingIngestId === doc.id;
        return (
          <li key={doc.id} className="panel flex flex-col gap-3 p-4 transition hover:border-white/20 sm:flex-row sm:items-center">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/30 to-cyan-400/20 text-indigo-200">
              <FileSearch aria-hidden="true" className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <Link
                to={`/documents/${doc.id}`}
                className="block truncate font-medium text-slate-100 hover:text-white hover:underline"
                title={doc.fileName}
              >
                {truncateMiddle(doc.fileName, 64)}
              </Link>
              <p className="mt-0.5 text-xs text-slate-500">
                #{doc.id} · {formatBytes(doc.fileSize)} · uploaded {formatDateTime(doc.createdAt)}
              </p>
            </div>

            <StatusBadge status={doc.documentStatus} />

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => onIngest(doc.id)}
                disabled={!ingestable || isIngesting}
                title={ingestable ? 'Run ingestion' : `Ingestion not available while ${doc.documentStatus}`}
                className="btn-secondary"
              >
                {isIngesting ? <Spinner label="Ingesting…" /> : 'Ingest'}
              </button>
              <Link to={`/documents/${doc.id}`} className="btn-secondary" title="View document">
                <Eye aria-hidden="true" className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">View</span>
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

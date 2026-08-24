import { useMemo, useState } from 'react';
import { FileSearch, Inbox } from 'lucide-react';
import { useDocuments, useIngestDocument } from '../hooks/useDocuments';
import { DocumentTable } from '../components/documents/DocumentTable';
import { UploadForm } from '../components/documents/UploadForm';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';

export function DocumentsPage() {
  const { data: documents, isLoading, isError, error, refetch } = useDocuments();
  const ingest = useIngestDocument();
  const [filter, setFilter] = useState('');

  const visible = useMemo(() => {
    if (!documents) return [];
    const needle = filter.trim().toLowerCase();
    if (!needle) return documents;
    return documents.filter(
      (doc) =>
        doc.fileName.toLowerCase().includes(needle) ||
        doc.documentStatus.toLowerCase().includes(needle),
    );
  }, [documents, filter]);

  const completedCount = documents?.filter((d) => d.documentStatus === 'COMPLETED').length ?? 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-white">Documents</h1>
        <p className="mt-1 text-sm text-slate-400">
          {documents
            ? `${documents.length} document${documents.length === 1 ? '' : 's'} · ${completedCount} searchable`
            : 'Loading your knowledge base…'}
        </p>
      </header>

      <UploadForm />

      <section aria-label="Document list" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="doc-filter" className="sr-only">
            Filter documents by name or status
          </label>
          <input
            id="doc-filter"
            type="search"
            placeholder="Filter by name or status…"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="input-field max-w-xs"
          />
          {(isError || (documents && documents.length === 0)) && null}
        </div>

        {isError && (
          <ErrorBanner
            message={error instanceof Error ? error.message : 'Unknown error'}
            onRetry={() => void refetch()}
          />
        )}

        {!isError && !isLoading && documents && documents.length === 0 && (
          <div className="panel">
            <EmptyState
              icon={Inbox}
              title="No documents yet"
              description="Upload your first document above to start building your knowledge base."
            />
          </div>
        )}

        {!isError && !isLoading && documents && documents.length > 0 && visible.length === 0 && (
          <div className="panel">
            <EmptyState
              icon={FileSearch}
              title="No matches"
              description={`No documents match "${filter}". Try a different filter.`}
              action={
                <button type="button" onClick={() => setFilter('')} className="btn-secondary">
                  Clear filter
                </button>
              }
            />
          </div>
        )}

        <DocumentTable
          documents={visible}
          isLoading={isLoading}
          pendingIngestId={ingest.isPending ? ingest.variables : undefined}
          onIngest={(id) => ingest.mutate(id)}
        />
      </section>
    </div>
  );
}

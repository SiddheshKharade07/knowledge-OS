import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileText, Layers, RefreshCw } from 'lucide-react';
import { useDocumentChunks, useDocumentContent } from '../hooks/useDocumentDetail';
import { useIngestDocument } from '../hooks/useDocuments';
import { cn } from '../lib/cn';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { Skeleton } from '../components/ui/Skeleton';
import { StatusBadge } from '../components/ui/StatusBadge';

type DetailTab = 'content' | 'chunks';

export function DocumentDetailPage() {
  const params = useParams<{ documentId: string }>();
  const documentId = Number.parseInt(params.documentId ?? '', 10);
  const validId = Number.isFinite(documentId) && documentId > 0 ? documentId : null;

  const [searchParams] = useSearchParams();
  const highlightChunkId = searchParams.get('chunk');
  const [tab, setTab] = useState<DetailTab>(highlightChunkId !== null ? 'chunks' : 'content');

  const contentQuery = useDocumentContent(validId);
  const chunksQuery = useDocumentChunks(validId);
  const ingest = useIngestDocument();

  if (validId === null) {
    return (
      <div className="panel">
        <EmptyState
          icon={FileText}
          title="Invalid document id"
          description={`"${params.documentId}" is not a valid document identifier.`}
          action={
            <Link to="/documents" className="btn-secondary">
              Back to documents
            </Link>
          }
        />
      </div>
    );
  }

  const content = contentQuery.data;
  const chunks = chunksQuery.data;
  const ingestable =
    (contentQuery.isFetched || chunksQuery.isFetched) &&
    (content?.content !== undefined || chunks !== undefined);

  return (
    <div className="space-y-6">
      <Link
        to="/documents"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        All documents
      </Link>

      <header className="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold tracking-tight text-white">
            {content?.fileName ?? `Document #${documentId}`}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            #{documentId}
            {content?.contentType ? ` · ${content.contentType}` : ''}
          </p>
          <div className="mt-3">
            <StatusBadge status={statusOf(contentQuery, chunks)} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => ingest.mutate(documentId)}
          disabled={!ingestable || ingest.isPending}
          title={
            ingestable
              ? 'Run ingestion'
              : 'Waiting for document metadata before ingestion can start'
          }
          className="btn-primary shrink-0 self-start sm:self-auto"
        >
          <RefreshCw aria-hidden="true" className={cn('h-4 w-4', ingest.isPending && 'animate-spin')} />
          {ingest.isPending ? 'Ingesting…' : 'Ingest'}
        </button>
      </header>

      {ingest.isError && (
        <ErrorBanner
          message={ingest.error instanceof Error ? ingest.error.message : 'Ingestion failed.'}
          onRetry={() => {
            ingest.reset();
            ingest.mutate(documentId);
          }}
        />
      )}

      <div role="tablist" aria-label="Document views" className="flex gap-1 rounded-xl border border-white/10 bg-black/20 p-1">
        <TabButton active={tab === 'content'} onClick={() => setTab('content')} label="Extracted content" icon={<FileText className="h-4 w-4" />} />
        <TabButton
          active={tab === 'chunks'}
          onClick={() => setTab('chunks')}
          label={`Chunks${chunks ? ` (${chunks.length})` : ''}`}
          icon={<Layers className="h-4 w-4" />}
        />
      </div>

      {tab === 'content' ? (
        <ContentView query={contentQuery} />
      ) : (
        <ChunksView
          query={chunksQuery}
          highlightChunkId={highlightChunkId}
        />
      )}
    </div>
  );
}

function statusOf(
  contentQuery: ReturnType<typeof useDocumentContent>,
  chunks: unknown,
): 'UPLOADED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'UPLOADED' {
  if (chunks !== undefined) return 'COMPLETED';
  if (contentQuery.data && contentQuery.data.content.length > 0) return 'COMPLETED';
  return 'UPLOADED';
}

function TabButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
        active
          ? 'bg-gradient-to-r from-indigo-500/25 to-violet-500/15 text-white shadow-inner'
          : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ContentView({
  query,
}: {
  query: ReturnType<typeof useDocumentContent>;
}) {
  if (query.isLoading) {
    return (
      <div className="panel space-y-3 p-5" aria-label="Loading content">
        {[0, 1, 2, 3].map((line) => (
          <Skeleton key={line} className={cn('h-4', line % 3 === 2 ? 'w-2/3' : 'w-full')} />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorBanner
        message={query.error instanceof Error ? query.error.message : 'Unknown error'}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const content = query.data;
  if (!content || content.content.trim().length === 0) {
    return (
      <div className="panel">
        <EmptyState
          icon={FileText}
          title="No extractable text"
          description="The backend returned no text for this document. It may be unprocessed or a scanned image PDF."
        />
      </div>
    );
  }

  return (
    <article className="panel p-5">
      <p className="mb-3 text-xs text-slate-500">Extracted text · served by the backend</p>
      <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-slate-300">
        {content.content}
      </pre>
    </article>
  );
}

function ChunksView({
  query,
  highlightChunkId,
}: {
  query: ReturnType<typeof useDocumentChunks>;
  highlightChunkId: string | null;
}) {
  const highlightRef = useRef<HTMLLIElement | null>(null);

  const chunks = query.data;

  useEffect(() => {
    if (!highlightChunkId || !chunks) return;
    const timer = window.setTimeout(() => {
      highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [highlightChunkId, chunks]);

  if (query.isLoading) {
    return (
      <div className="space-y-3" aria-label="Loading chunks">
        {[0, 1].map((row) => (
          <div key={row} className="panel space-y-2 p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorBanner
        message={query.error instanceof Error ? query.error.message : 'Unknown error'}
        onRetry={() => void query.refetch()}
      />
    );
  }

  if (!chunks || chunks.length === 0) {
    return (
      <div className="panel">
        <EmptyState
          icon={Layers}
          title="No chunks yet"
          description="This document has not been ingested, so it has no indexed chunks. Run ingestion to build them."
        />
      </div>
    );
  }

  return (
    <ul role="list" className="space-y-3" aria-label="Document chunks">
      {chunks.map((chunk) => {
        const highlighted = highlightChunkId !== null && String(chunk.id) === highlightChunkId;
        return (
          <li
            key={chunk.id}
            ref={highlighted ? highlightRef : undefined}
            id={`chunk-${chunk.id}`}
            tabIndex={-1}
            className={cn(
              'panel scroll-mt-24 p-5 transition',
              highlighted &&
                '!border-indigo-400/60 ring-2 ring-indigo-400/40 animate-fade-in-up',
            )}
          >
            <div className="mb-2 flex items-center justify-between gap-3 text-xs">
              <span className="font-mono font-semibold text-indigo-300">
                chunk #{chunk.chunkIndex}
              </span>
              <span className="text-slate-500">{chunk.tokenCount ?? '?'} tokens</span>
            </div>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-300">
              {chunk.content}
            </p>
            {highlighted && (
              <p className="mt-2 text-xs italic text-indigo-300/80">
                Highlighted from chat citation.
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

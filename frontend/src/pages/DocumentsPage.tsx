import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, RefreshCw, Search, Upload } from 'lucide-react';
import * as React from 'react';
import { documentsApi } from '../api/documents';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal, ModalBody, ModalHeader } from '../components/ui/Modal';
import { StatusPill } from '../components/ui/StatusPill';
import { Spinner } from '../components/ui/Spinner';
import { formatBytes, formatDate } from '../lib/utils';
import { isAdmin } from '../lib/permissions';
import { useAuthStore } from '../stores/auth';
import { toast } from 'sonner';
import type { Document, DocumentChunk } from '../api/types';

const filters = ['all', 'uploaded', 'processing', 'completed', 'failed'] as const;
type Filter = (typeof filters)[number];

export default function DocumentsPage() {
  const user = useAuthStore((s) => s.user);
  const admin = isAdmin(user);
  const queryClient = useQueryClient();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState<Filter>('all');
  const [detailId, setDetailId] = React.useState<number | null>(null);

  const docsQuery = useQuery({
    queryKey: ['documents'],
    queryFn: documentsApi.list,
    refetchInterval: (q) => {
      const data = q.state.data as Document[] | undefined;
      if (data?.some((d) => d.documentStatus === 'PROCESSING')) return 5000;
      return false;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => documentsApi.upload(file),
    onSuccess: async (doc) => {
      toast.success('Uploaded');
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      if (admin) {
        try {
          await documentsApi.ingest(doc.id);
          toast.success('Ingestion started');
          await queryClient.invalidateQueries({ queryKey: ['documents'] });
        } catch (err: any) {
          toast.error(err?.message || 'Failed to start ingestion');
        }
      }
    },
    onError: (err: any) => toast.error(err?.message || 'Upload failed'),
  });

  const ingestMutation = useMutation({
    mutationFn: (id: number) => documentsApi.ingest(id),
    onSuccess: () => {
      toast.success('Ingestion started');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to ingest'),
  });

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMutation.mutate(file);
    e.target.value = '';
  };

  const docs = docsQuery.data ?? [];
  const filtered = docs.filter((d) => {
    const matchesFilter = filter === 'all' || d.documentStatus.toLowerCase() === filter;
    const matchesSearch = search.trim() ? d.fileName.toLowerCase().includes(search.toLowerCase()) : true;
    return matchesFilter && matchesSearch;
  });

  const counts = {
    all: docs.length,
    uploaded: docs.filter((d) => d.documentStatus === 'UPLOADED').length,
    processing: docs.filter((d) => d.documentStatus === 'PROCESSING').length,
    completed: docs.filter((d) => d.documentStatus === 'COMPLETED').length,
    failed: docs.filter((d) => d.documentStatus === 'FAILED').length,
  };

  const totalBytes = docs.reduce((acc, d) => acc + (d.fileSize || 0), 0);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-on-surface">Documents</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Manage and search your organization's knowledge base.</p>
        </div>
        {admin ? (
          <>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.md,.csv" className="hidden" onChange={handleUpload} />
            <Button onClick={() => fileRef.current?.click()} disabled={uploadMutation.isPending} className="h-[46px] bg-gradient-to-r from-[#5145E5] to-[#6d5efc] shadow-card">
              <Upload className="h-4 w-4" />
              {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
            </Button>
          </>
        ) : null}
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-outline-variant/50 bg-white px-4 py-2.5 shadow-[0_1px_1px_rgba(15,23,42,0.02),0_10px_40px_rgba(81,69,229,0.04)]">
        <div className="flex items-center gap-2 text-sm text-on-surface-variant">
          <FileText className="h-4 w-4" />
          <span>
            {docs.length} documents · {formatBytes(totalBytes)}
          </span>
        </div>
        <span className="text-sm text-on-surface-variant">
          {filtered.length} of {docs.length} shown
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by filename..." className="pl-9" />
        </div>
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm transition-colors ${
                filter === f
                  ? 'bg-primary text-on-primary'
                  : 'border border-outline-variant/70 bg-surface-container-lowest text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="capitalize">{f === 'all' ? 'All' : f}</span>
              <span className="text-xs opacity-80">{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {docsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-outline-variant/50 bg-surface-container-lowest py-12 text-center shadow-card">
            <FileText className="mb-2 h-8 w-8 text-on-surface-variant/60" />
            <p className="text-sm text-on-surface">No documents</p>
            <p className="text-sm text-on-surface-variant">Upload a document to start building your knowledge base.</p>
          </div>
        ) : (
          filtered.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-col gap-3 rounded-2xl border border-outline-variant/50 bg-white p-4 shadow-[0_1px_1px_rgba(15,23,42,0.02),0_10px_40px_rgba(81,69,229,0.04)] transition-shadow hover:shadow-[0_1px_1px_rgba(15,23,42,0.02),0_12px_44px_rgba(81,69,229,0.06)]"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#eae7ff] to-[#e7f0ff]">
                  <FileText className="h-5 w-5 text-[#5145E5]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-on-surface">{doc.fileName}</p>
                    <StatusPill status={doc.documentStatus} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
                    <span>{formatBytes(doc.fileSize)}</span>
                    <span className="h-1 w-1 rounded-full bg-outline-variant" />
                    <span>Owner: {doc.ownerName || 'Unknown owner'}</span>
                    {doc.ownerEmail ? (
                      <>
                        <span className="h-1 w-1 rounded-full bg-outline-variant" />
                        <span className="truncate">{doc.ownerEmail}</span>
                      </>
                    ) : null}
                    <span className="h-1 w-1 rounded-full bg-outline-variant" />
                    <span>{doc.documentStatus === 'COMPLETED' ? 'Ready for search' : doc.documentStatus === 'PROCESSING' ? 'Indexing...' : 'Pending ingestion'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-outline-variant/40 pt-3">
                <span className="text-xs text-on-surface-variant">
                  {doc.createdAt ? formatDate(doc.createdAt) : formatDate(new Date().toISOString())}
                </span>
                <div className="flex items-center gap-2">
                  {doc.documentStatus === 'COMPLETED' ? (
                    <Button size="sm" variant="secondary" onClick={() => setDetailId(doc.id)}>
                      View details
                    </Button>
                  ) : null}
                  {(doc.documentStatus === 'UPLOADED' || doc.documentStatus === 'FAILED') && admin ? (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => ingestMutation.mutate(doc.id)}
                      disabled={ingestMutation.isPending}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      {doc.documentStatus === 'FAILED' ? 'Retry ingest' : 'Ingest'}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <DocumentDetailModal id={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

function DocumentDetailModal({ id, onClose }: { id: number | null; onClose: () => void }) {
  const chunksQuery = useQuery({
    queryKey: ['documents', id, 'chunks'],
    queryFn: () => documentsApi.getChunks(id as number),
    enabled: id !== null,
  });
  const contentQuery = useQuery({
    queryKey: ['documents', id, 'content'],
    queryFn: () => documentsApi.getContent(id as number),
    enabled: id !== null,
  });

  const chunks: DocumentChunk[] = chunksQuery.data ?? [];

  return (
    <Modal open={id !== null} onClose={onClose} className="sm:max-w-3xl">
      <ModalHeader title="Document details" description={`${chunks.length} chunk(s) indexed`} onClose={onClose} />
      <ModalBody className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-on-surface">Chunks</p>
          {chunksQuery.isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Spinner />
            </div>
          ) : chunks.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No chunks available.</p>
          ) : (
            <div className="space-y-2">
              {chunks.slice(0, 50).map((c) => (
                <div key={c.id} className="rounded-lg border border-outline-variant/50 bg-surface-container-low p-3">
                  <div className="mb-1 flex items-center justify-between text-xs text-on-surface-variant">
                    <span>Chunk #{c.chunkIndex}</span>
                    {c.tokenCount ? <span>{c.tokenCount} tokens</span> : null}
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-on-surface">{c.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-on-surface">Preview</p>
          {contentQuery.isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Spinner />
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto rounded-lg border border-outline-variant/50 bg-surface-container-low p-3">
              <pre className="whitespace-pre-wrap font-mono text-xs text-on-surface">{contentQuery.data?.content || 'No content.'}</pre>
            </div>
          )}
        </div>
      </ModalBody>
    </Modal>
  );
}

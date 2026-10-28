import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, RefreshCw, Search, Upload } from 'lucide-react';
import * as React from 'react';
import { documentsApi } from '../api/documents';
import { departmentsApi } from '../api/departments';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Dropdown } from '../components/ui/Dropdown';
import { Input } from '../components/ui/Input';
import { Modal, ModalBody, ModalHeader } from '../components/ui/Modal';
import { StatusPill } from '../components/ui/StatusPill';
import { Spinner } from '../components/ui/Spinner';
import { formatBytes, formatDate } from '../lib/utils';
import { canManageDocs, isAdmin } from '../lib/permissions';
import { useAuthStore } from '../stores/auth';
import { toast } from 'sonner';
import type { Department, Document, DocumentChunk } from '../api/types';

const filters = ['all', 'uploaded', 'processing', 'completed', 'failed'] as const;
type Filter = (typeof filters)[number];

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function DocumentsPage() {
  const user = useAuthStore((s) => s.user);
  const canManage = canManageDocs(user);
  const isAdminUser = isAdmin(user);
  const queryClient = useQueryClient();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [filter, setFilter] = React.useState<Filter>('all');
  const [detailId, setDetailId] = React.useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [selectedDeptIds, setSelectedDeptIds] = React.useState<number[]>([]);
  const [uploadModalOpen, setUploadModalOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Document | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const docsQuery = useQuery({
    queryKey: ['documents'],
    queryFn: documentsApi.list,
    refetchInterval: (q) => {
      const data = q.state.data as Document[] | undefined;
      if (data?.some((d) => d.documentStatus === 'PROCESSING')) return 5000;
      return false;
    },
  });

  const departmentsQuery = useQuery({
    queryKey: ['departments'],
    queryFn: departmentsApi.list,
    enabled: canManage,
  });

  // ADMIN can upload to any department; KNOWLEDGE_MANAGER only to assigned ones.
  const departmentOptions = React.useMemo<Department[]>(() => {
    const all = departmentsQuery.data ?? [];
    if (isAdminUser) return all;
    const assigned = user?.departmentIds ?? [];
    return all.filter((dept) => assigned.some((id) => Number(id) === dept.id));
  }, [departmentsQuery.data, isAdminUser, user?.departmentIds]);

  const uploadMutation = useMutation({
    mutationFn: ({ files, deptIds }: { files: File[]; deptIds: number[] }) => {
      if (files.length === 1) {
        return documentsApi.upload(files[0], deptIds).then((doc) => [doc]);
      }
      return documentsApi.uploadBatch(files, deptIds);
    },
    onSuccess: async (docs) => {
      toast.success(docs.length === 1 ? 'Uploaded' : `${docs.length} documents uploaded`);
      setSelectedFiles([]);
      setSelectedDeptIds([]);
      setUploadModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      if (canManage) {
        for (const doc of docs) {
          try {
            await documentsApi.ingest(doc.id);
          } catch (err) {
            toast.error(getErrorMessage(err, 'Failed to start ingestion'));
          }
        }
        await queryClient.invalidateQueries({ queryKey: ['documents'] });
        toast.success('Ingestion started for uploaded documents');
      }
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Upload failed')),
  });

  const ingestMutation = useMutation({
    mutationFn: (id: number) => documentsApi.ingest(id),
    onSuccess: () => {
      toast.success('Ingestion started');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to ingest')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => documentsApi.delete(id),
    onSuccess: () => {
      toast.success('Document deleted');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      if (detailId && docsQuery.data?.find((d) => d.id === detailId) === undefined) {
        setDetailId(null);
      }
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to delete document')),
  });

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setSelectedFiles((prev) => [...prev, ...files]);
    e.target.value = '';
  };

  const openUpload = () => {
    if (!canManage) return;
    setSelectedFiles([]);
    setSelectedDeptIds([]);
    setUploadModalOpen(true);
  };

  const submitUpload = () => {
    if (selectedDeptIds.length === 0) {
      toast.error('Please select at least one department before uploading documents.');
      return;
    }
    if (selectedFiles.length === 0) {
      toast.error('Select at least one file');
      return;
    }
    uploadMutation.mutate({ files: selectedFiles, deptIds: selectedDeptIds });
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const docs = docsQuery.data ?? [];
  const filtered = docs.filter((d) => {
    const matchesFilter = filter === 'all' || d.documentStatus.toLowerCase() === filter;
    const matchesSearch = debouncedSearch ? d.fileName.toLowerCase().includes(debouncedSearch.toLowerCase()) : true;
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
        {canManage ? (
          <Button onClick={openUpload} disabled={uploadMutation.isPending} className="h-[46px] bg-gradient-to-r from-[#5145E5] to-[#6d5efc] shadow-card">
            <Upload className="h-4 w-4" />
            {uploadMutation.isPending ? 'Uploading...' : 'Upload documents'}
          </Button>
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
          {docsQuery.isFetching && !docsQuery.isLoading ? (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Spinner className="h-4 w-4" />
            </div>
          ) : null}
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
        {docsQuery.isLoading && docs.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        ) : docsQuery.isError ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-outline-variant/50 bg-surface-container-lowest py-12 text-center shadow-card">
            <FileText className="mb-2 h-8 w-8 text-on-surface-variant/60" />
            <p className="text-sm text-on-surface">Failed to load documents</p>
            <p className="mt-1 text-sm text-on-surface-variant">Please try again.</p>
            <Button className="mt-4" size="sm" onClick={() => docsQuery.refetch()}>
              Retry
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-outline-variant/50 bg-surface-container-lowest py-12 text-center shadow-card">
            <FileText className="mb-2 h-8 w-8 text-on-surface-variant/60" />
            <p className="text-sm text-on-surface">No documents found</p>
            <p className="text-sm text-on-surface-variant">
              {debouncedSearch ? 'Try adjusting your search or filters.' : 'Upload a document to start building your knowledge base.'}
            </p>
            {debouncedSearch ? (
              <Button className="mt-4" size="sm" variant="secondary" onClick={() => setSearch('')}>
                Clear search
              </Button>
            ) : null}
          </div>
        ) : (
          <div className={`transition-opacity duration-150 ${docsQuery.isFetching && !docsQuery.isLoading ? 'opacity-60' : 'opacity-100'}`}>
          {filtered.map((doc) => (
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
                  {(doc.documentStatus === 'UPLOADED' || doc.documentStatus === 'FAILED') && canManage ? (
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
                  {canManage ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => {
                        setDeleteTarget(doc);
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>

      <DocumentDetailModal id={detailId} onClose={() => setDetailId(null)} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete document?"
        description={
          <>
            Are you sure you want to delete{' '}
            <span className="font-medium text-on-surface">{deleteTarget?.fileName}</span>?
            This action will remove the document and its associated searchable content.
          </>
        }
        confirmLabel="Delete document"
        destructive
        busy={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />

      <Modal open={uploadModalOpen} onClose={() => setUploadModalOpen(false)} className="sm:max-w-2xl">
        <ModalHeader title="Upload documents" description="Select department(s) and documents to upload." onClose={() => setUploadModalOpen(false)} />
        <ModalBody>
          <div className="space-y-4">
            <div className="space-y-2">
              <Dropdown
                mode="multi"
                label="Select Department(s)"
                placeholder="Select departments"
                options={departmentOptions.map((dept) => ({ value: dept.id, label: dept.name }))}
                value={selectedDeptIds}
                onChange={(value) => setSelectedDeptIds(value.map((v) => Number(v)).filter(Boolean))}
                searchable={departmentOptions.length > 6}
                clearable
                loading={departmentsQuery.isLoading}
                loadingText="Loading departments..."
                emptyText={
                  isAdminUser
                    ? 'No departments available.'
                    : 'No authorized departments are assigned to your account. Contact an administrator.'
                }
                error={
                  departmentsQuery.isError
                    ? 'Failed to load departments. Please try again.'
                    : selectedDeptIds.length === 0
                      ? 'Please select at least one department before uploading documents.'
                      : null
                }
                disabled={uploadMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-on-surface">Select documents</p>
              <input ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.md,.csv" className="hidden" onChange={handleUpload} />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploadMutation.isPending}>
                <Upload className="h-4 w-4" />
                Browse files
              </Button>
              {selectedFiles.length === 0 ? (
                <p className="text-xs text-on-surface-variant">No files selected.</p>
              ) : (
                <div className="space-y-2">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-lg border border-outline-variant/40 p-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-on-surface">{file.name}</p>
                        <p className="text-xs text-on-surface-variant">{formatBytes(file.size)}</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => removeFile(idx)} disabled={uploadMutation.isPending}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setUploadModalOpen(false)} disabled={uploadMutation.isPending}>
                Cancel
              </Button>
              <Button
                onClick={submitUpload}
                disabled={
                  uploadMutation.isPending ||
                  selectedDeptIds.length === 0 ||
                  selectedFiles.length === 0 ||
                  departmentsQuery.isLoading ||
                  departmentsQuery.isError ||
                  departmentOptions.length === 0
                }
              >
                {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        </ModalBody>
      </Modal>
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


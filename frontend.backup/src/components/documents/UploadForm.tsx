import { useRef, useState } from 'react';
import { CloudUpload, FileText, X } from 'lucide-react';
import { useUploadDocument } from '../../hooks/useDocuments';
import { formatBytes } from '../../lib/format';

const MAX_FILE_NAME_LENGTH = 255;
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const ACCEPTED_TYPES = '.txt,.md,.pdf';

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadDocument(setError);

  function selectFile(selected: File | null) {
    setError(null);
    if (!selected) return;
    if (!selected.name.trim() || selected.name.length > MAX_FILE_NAME_LENGTH) {
      setError('File name must be between 1 and 255 characters.');
      return;
    }
    if (selected.size === 0) {
      setError('The selected file is empty.');
      return;
    }
    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setError(`File exceeds the ${formatBytes(MAX_FILE_SIZE_BYTES)} upload limit.`);
      return;
    }
    setFile(selected);
  }

  function clearFile() {
    setFile(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!file) {
      setError('Choose a file to upload first.');
      return;
    }
    upload.mutate(file, {
      onSuccess: clearFile,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="panel p-4 sm:p-5" aria-label="Add document">
      <label htmlFor="file-input" className="block text-sm font-medium text-slate-300">
        Add a document
      </label>
      <p className="mt-1 text-xs text-slate-500">
        Choose a .txt, .md or .pdf file from your device (max {formatBytes(MAX_FILE_SIZE_BYTES)}).
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <input
          ref={inputRef}
          id="file-input"
          name="file"
          type="file"
          accept={ACCEPTED_TYPES}
          className="sr-only"
          onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
        />
        <div className="flex min-w-0 flex-1 items-center gap-1 rounded-lg border border-white/10 bg-black/30 pr-1 transition focus-within:border-indigo-400/60 focus-within:ring-2 focus-within:ring-indigo-500/30">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-left text-sm transition hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
            aria-label={file ? `Selected file: ${file.name}. Choose a different file` : 'Choose a file from your device'}
          >
            {file ? (
              <span className="flex min-w-0 items-center gap-2">
                <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-indigo-300" />
                <span className="truncate">{file.name}</span>
                <span className="shrink-0 text-xs text-slate-500">{formatBytes(file.size)}</span>
              </span>
            ) : (
              <span className="text-slate-500">No file chosen — click to browse…</span>
            )}
          </button>
          {file && (
            <button
              type="button"
              aria-label="Remove selected file"
              title="Remove selection"
              onClick={clearFile}
              className="rounded p-1.5 text-slate-500 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button type="submit" disabled={!file || upload.isPending} className="btn-primary shrink-0">
          <CloudUpload aria-hidden="true" className="h-4 w-4" />
          {upload.isPending ? 'Uploading…' : 'Upload'}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-rose-300">
          {error}
        </p>
      )}
    </form>
  );
}

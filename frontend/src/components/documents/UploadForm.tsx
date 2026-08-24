import { useState } from 'react';
import { CloudUpload } from 'lucide-react';
import { useUploadDocument } from '../../hooks/useDocuments';

const MAX_FILE_NAME_LENGTH = 255;

export function UploadForm() {
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const upload = useUploadDocument(setError);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const trimmed = fileName.trim();
    if (!trimmed) {
      setError('File name is required.');
      return;
    }
    if (trimmed.length > MAX_FILE_NAME_LENGTH) {
      setError(`File name must be at most ${MAX_FILE_NAME_LENGTH} characters.`);
      return;
    }
    upload.mutate(trimmed, {
      onSuccess: () => setFileName(''),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="panel p-4 sm:p-5" aria-label="Add document">
      <label htmlFor="file-name" className="block text-sm font-medium text-slate-300">
        Add a document
      </label>
      <p className="mt-1 text-xs text-slate-500">
        Provide the stored object name (e.g. company-policies.txt). The file must already exist in
        the MinIO bucket.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          id="file-name"
          name="fileName"
          type="text"
          autoComplete="off"
          maxLength={MAX_FILE_NAME_LENGTH}
          placeholder="company-policies.txt"
          value={fileName}
          onChange={(event) => setFileName(event.target.value)}
          aria-invalid={error !== null}
          aria-describedby={error ? 'file-name-error' : undefined}
          className="input-field flex-1"
        />
        <button type="submit" disabled={upload.isPending} className="btn-primary shrink-0">
          <CloudUpload aria-hidden="true" className="h-4 w-4" />
          {upload.isPending ? 'Uploading…' : 'Upload'}
        </button>
      </div>
      {error && (
        <p id="file-name-error" role="alert" className="mt-2 text-sm text-rose-300">
          {error}
        </p>
      )}
    </form>
  );
}

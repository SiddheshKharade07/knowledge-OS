import { Link } from 'react-router-dom';
import { FileText, Quote } from 'lucide-react';
import type { Citation } from '../../api/types';

export function CitationChips({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;
  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
        <Quote aria-hidden="true" className="h-3 w-3" />
        Sources
      </p>
      <ul role="list" className="flex flex-wrap gap-2">
        {citations.map((citation) => (
          <li key={citation.chunkId}>
            <Link
              to={`/documents/${citation.documentId}?chunk=${citation.chunkId}`}
              title={`Open ${citation.documentName}, chunk ${citation.chunkIndex}`}
              className="inline-flex max-w-xs items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-400/10 px-3 py-1 text-xs font-medium text-indigo-200 transition hover:border-indigo-300/50 hover:bg-indigo-400/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              <FileText aria-hidden="true" className="h-3 w-3 shrink-0" />
              <span className="truncate">{citation.documentName}</span>
              <span className="shrink-0 text-indigo-300/70">· ch {citation.chunkIndex}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

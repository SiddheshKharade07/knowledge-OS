export type DocumentStatus = 'UPLOADED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface DocumentResponse {
  id: number;
  fileName: string;
  contentType?: string | null;
  fileSize?: number | null;
  documentStatus: DocumentStatus;
  createdAt?: string | null;
}

export interface FileContentResponse {
  fileName: string;
  contentType?: string | null;
  content: string;
}

export interface DocumentChunkResponse {
  id: number;
  documentId: number;
  chunkIndex: number;
  content: string;
  tokenCount?: number | null;
}

export interface Citation {
  documentId: number;
  documentName: string;
  chunkId: number;
  chunkIndex: number;
}

export interface RagQueryRequest {
  query: string;
}

export interface RagResponse {
  query: string;
  answer: string;
  citations: Citation[];
}

export interface ApiErrorPayload {
  status?: number;
  error?: string;
  message?: string;
  details?: string[];
  timestamp?: string;
}

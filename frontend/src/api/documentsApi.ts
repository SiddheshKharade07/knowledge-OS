import { http } from './client';
import type { DocumentChunkResponse, DocumentResponse, FileContentResponse } from './types';

export interface DocumentsApi {
  listDocuments(): Promise<DocumentResponse[]>;
  uploadDocument(file: File): Promise<DocumentResponse>;
  ingestDocument(id: number): Promise<void>;
  getDocumentContent(id: number): Promise<FileContentResponse>;
  getDocumentChunks(id: number): Promise<DocumentChunkResponse[]>;
}

export const realDocumentsApi: DocumentsApi = {
  async listDocuments() {
    const { data } = await http.get<DocumentResponse[]>('/v1/documents');
    return data;
  },

  async uploadDocument(file) {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await http.post<DocumentResponse>('/v1/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async ingestDocument(id) {
    await http.post(`/v1/documents/${id}/ingest`);
  },

  async getDocumentContent(id) {
    const { data } = await http.get<FileContentResponse>(`/v1/documents/${id}/content`);
    return data;
  },

  async getDocumentChunks(id) {
    const { data } = await http.get<DocumentChunkResponse[]>(`/v1/documents/${id}/chunks`);
    return data;
  },
};

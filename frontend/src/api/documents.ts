import { http } from './client';
import type { Document, DocumentChunk, FileContent } from './types';

export const documentsApi = {
  list: async (): Promise<Document[]> => {
    const res = await http.get<Document[]>('/v1/documents');
    return res.data;
  },
  upload: async (file: File, departmentIds?: number[]): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);
    if (departmentIds && departmentIds.length > 0) {
      departmentIds.forEach((id) => formData.append('departmentIds', String(id)));
    }
    const res = await http.post<Document>('/v1/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  uploadBatch: async (files: File[], departmentIds: number[]): Promise<Document[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    departmentIds.forEach((id) => formData.append('departmentIds', String(id)));
    const res = await http.post<Document[]>('/v1/documents/batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  ingest: async (id: number): Promise<void> => {
    await http.post(`/v1/documents/${id}/ingest`);
  },
  getContent: async (id: number): Promise<FileContent> => {
    const res = await http.get<FileContent>(`/v1/documents/${id}/content`);
    return res.data;
  },
  getChunks: async (id: number): Promise<DocumentChunk[]> => {
    const res = await http.get<DocumentChunk[]>(`/v1/documents/${id}/chunks`);
    return res.data;
  },
  delete: async (id: number): Promise<void> => {
    await http.delete(`/v1/documents/${id}`);
  },
};

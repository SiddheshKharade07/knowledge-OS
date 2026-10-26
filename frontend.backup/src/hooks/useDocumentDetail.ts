import { useQuery } from '@tanstack/react-query';
import { documentsApi } from '../api';

export function useDocumentContent(id: number | null) {
  return useQuery({
    queryKey: ['document', id, 'content'],
    queryFn: () => documentsApi.getDocumentContent(id as number),
    enabled: id !== null,
  });
}

export function useDocumentChunks(id: number | null) {
  return useQuery({
    queryKey: ['document', id, 'chunks'],
    queryFn: () => documentsApi.getDocumentChunks(id as number),
    enabled: id !== null,
  });
}

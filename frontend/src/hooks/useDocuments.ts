import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '../api';
import type { DocumentResponse } from '../api/types';

export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsApi.listDocuments(),
  });
}

export function useUploadDocument(onError?: (message: string) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileName: string) => documentsApi.uploadDocument(fileName),
    onSuccess: (uploaded: DocumentResponse) => {
      queryClient.setQueryData<DocumentResponse[]>(['documents'], (current) =>
        current ? [uploaded, ...current] : [uploaded],
      );
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (error: Error) => onError?.(error.message),
  });
}

export function useIngestDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => documentsApi.ingestDocument(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
      void queryClient.invalidateQueries({ queryKey: ['document', id] });
    },
  });
}

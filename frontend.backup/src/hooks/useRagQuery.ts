import { useMutation } from '@tanstack/react-query';
import { ragApi } from '../api';
import type { RagQueryRequest, RagResponse } from '../api/types';

export function useRagQuery() {
  return useMutation<RagResponse, Error, RagQueryRequest>({
    mutationFn: (request) => ragApi.query(request),
  });
}

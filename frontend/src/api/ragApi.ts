import { http } from './client';
import type { RagQueryRequest, RagResponse } from './types';

export interface RagApi {
  query(request: RagQueryRequest): Promise<RagResponse>;
}

export const realRagApi: RagApi = {
  async query(request) {
    const { data } = await http.post<RagResponse>('/v1/rag/query', request);
    return data;
  },
};

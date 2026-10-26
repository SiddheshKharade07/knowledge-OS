import { mockDocumentsApi, mockRagApi } from '../mocks/mockBackend';
import { realDocumentsApi } from './documentsApi';
import type { DocumentsApi } from './documentsApi';
import { realRagApi } from './ragApi';
import type { RagApi } from './ragApi';

const useMocks =
  (import.meta.env.VITE_ENABLE_MOCKS ?? 'false').toString().trim().toLowerCase() === 'true';

export const isDemoMode = useMocks;

export const documentsApi: DocumentsApi = useMocks ? mockDocumentsApi : realDocumentsApi;
export const ragApi: RagApi = useMocks ? mockRagApi : realRagApi;

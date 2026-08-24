import type {
  DocumentChunkResponse,
  DocumentResponse,
  RagQueryRequest,
  RagResponse,
} from '../api/types';
import type { DocumentsApi } from '../api/documentsApi';
import type { RagApi } from '../api/ragApi';

const LATENCY_MS = 500;
export const MOCK_FAILURE_KEY = 'knowledgeos.mockFailures';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function latency(): Promise<void> {
  return sleep(LATENCY_MS + Math.random() * LATENCY_MS);
}

function maybeFail(operation: string): void {
  if (localStorage.getItem(MOCK_FAILURE_KEY) === 'true') {
    throw new Error(`Simulated network failure in demo mode (${operation}).`);
  }
}

let nextId = 100;

interface MockChunkSeed {
  chunkIndex: number;
  content: string;
  tokenCount: number;
}

const policyChunks: MockChunkSeed[] = [
  {
    chunkIndex: 0,
    content:
      'Remote Work Policy. Employees may work remotely up to three days per week with manager approval. Fully remote arrangements require VP sign-off and are reviewed every six months.',
    tokenCount: 41,
  },
  {
    chunkIndex: 1,
    content:
      'Core collaboration hours are 10:00-15:00 in your team primary timezone. Employees working from another country for more than 20 days per year must consult HR for tax implications.',
    tokenCount: 38,
  },
  {
    chunkIndex: 2,
    content:
      'Expense Policy. Monthly equipment budget is $150. Internet reimbursement covers up to $50 per month upon submission of receipts through the finance portal.',
    tokenCount: 32,
  },
  {
    chunkIndex: 3,
    content:
      'Vacation accrues at 1.75 days per month, capped at 30 days carryover. Unused vacation beyond the cap is paid out each January.',
    tokenCount: 28,
  },
];

const onboardingChunks: MockChunkSeed[] = [
  {
    chunkIndex: 0,
    content:
      'Day one checklist: collect your laptop from IT, enroll in SSO, join the #general and #team channels, and schedule intro meetings with your buddy and manager.',
    tokenCount: 33,
  },
  {
    chunkIndex: 1,
    content:
      'Access requests go through the IT portal. Standard tooling (Slack, Jira, GitHub) is provisioned automatically within two hours of SSO enrollment.',
    tokenCount: 29,
  },
];

interface MockDocumentSeed {
  id: number;
  fileName: string;
  contentType: string;
  fileSize: number;
  documentStatus: DocumentResponse['documentStatus'];
  createdAt: string;
  chunks: MockChunkSeed[];
}

const seedDocuments: MockDocumentSeed[] = [
  {
    id: 35,
    fileName: 'company-policies.txt',
    contentType: 'text/plain',
    fileSize: 12_842,
    documentStatus: 'COMPLETED',
    createdAt: '2026-08-23T09:14:00Z',
    chunks: policyChunks.map((chunk) => ({ ...chunk, documentId: 35 })),
  },
  {
    id: 36,
    fileName: 'onboarding-guide.txt',
    contentType: 'text/plain',
    fileSize: 8_120,
    documentStatus: 'COMPLETED',
    createdAt: '2026-08-24T07:02:00Z',
    chunks: onboardingChunks.map((chunk) => ({ ...chunk, documentId: 36 })),
  },
  {
    id: 37,
    fileName: 'architecture-notes.txt',
    contentType: 'text/plain',
    fileSize: 4_410,
    documentStatus: 'UPLOADED',
    createdAt: '2026-08-24T08:47:00Z',
    chunks: [],
  },
];

let documents: DocumentResponse[] = seedDocuments.map(({ chunks: _chunks, ...doc }) => doc);
const chunksByIdDoc: Map<number, DocumentChunkResponse[]> = new Map(
  seedDocuments.map((doc) => [
    doc.id,
    doc.chunks.map(({ chunkIndex, content, tokenCount }) => ({
      id: doc.id * 1000 + chunkIndex,
      documentId: doc.id,
      chunkIndex,
      content,
      tokenCount,
    })),
  ]),
);

function toChunkList(documentId: number): DocumentChunkResponse[] {
  return [...(chunksByIdDoc.get(documentId) ?? [])].sort((a, b) => a.chunkIndex - b.chunkIndex);
}

export const mockDocumentsApi: DocumentsApi = {
  async listDocuments() {
    await latency();
    maybeFail('list documents');
    return [...documents].sort(
      (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
    );
  },

  async uploadDocument(fileName) {
    await latency();
    maybeFail('upload');
    const trimmed = fileName.trim();
    if (!trimmed || trimmed.length > 255) {
      throw new Error('fileName must be between 1 and 255 characters.');
    }
    const now = new Date().toISOString();
    const document: DocumentResponse = {
      id: ++nextId,
      fileName: trimmed,
      contentType: trimmed.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'text/plain',
      fileSize: Math.floor(2_000 + Math.random() * 40_000),
      documentStatus: 'UPLOADED',
      createdAt: now,
    };
    documents = [document, ...documents];
    return document;
  },

  async ingestDocument(id) {
    await latency();
    maybeFail('ingest');
    const target = documents.find((doc) => doc.id === id);
    if (!target) {
      throw Object.assign(new Error(`Document ${id} not found.`), { status: 404 });
    }
    target.documentStatus = 'COMPLETED';
    if (!chunksByIdDoc.has(id)) {
      chunksByIdDoc.set(
        id,
        policyChunks.slice(0, 2).map(({ chunkIndex, content, tokenCount }) => ({
          id: id * 1000 + chunkIndex,
          documentId: id,
          chunkIndex,
          content: `Ingested summary for ${target.fileName}: ${content}`,
          tokenCount,
        })),
      );
    }
  },

  async getDocumentContent(id) {
    await latency();
    maybeFail('fetch content');
    const target = documents.find((doc) => doc.id === id);
    if (!target) {
      throw Object.assign(new Error(`Document ${id} not found.`), { status: 404 });
    }
    const chunkList = toChunkList(id);
    return {
      fileName: target.fileName,
      contentType: target.contentType,
      content:
        chunkList.length > 0
          ? chunkList.map((chunk) => `[chunk ${chunk.chunkIndex}] ${chunk.content}`).join('\n\n')
          : '',
    };
  },

  async getDocumentChunks(id) {
    await latency();
    maybeFail('fetch chunks');
    if (!documents.some((doc) => doc.id === id)) {
      throw Object.assign(new Error(`Document ${id} not found.`), { status: 404 });
    }
    return toChunkList(id);
  },
};

export const mockRagApi: RagApi = {
  async query(request: RagQueryRequest): Promise<RagResponse> {
    await sleep(900 + Math.random() * 800);
    maybeFail('rag query');
    const query = request.query.trim();
    const remoteRelated = /remote|work from home|wfh|office/i.test(query);
    const expenseRelated = /expense|budget|reimburse/i.test(query);

    const cited = remoteRelated ? [toChunkList(35)[0]] : expenseRelated ? [toChunkList(35)[2]] : [toChunkList(36)[0]];
    const answerBase = remoteRelated
      ? 'Employees may work remotely up to three days per week with manager approval; fully remote arrangements require VP sign-off and are reviewed every six months. Core collaboration hours are 10:00-15:00 in your team primary timezone.'
      : expenseRelated
        ? 'The monthly equipment budget is $150 and internet costs are reimbursed up to $50 per month when receipts are submitted through the finance portal.'
        : 'On day one you collect your laptop from IT, enroll in SSO, join the #general and #team channels, and schedule intro meetings with your buddy and manager.';

    return {
      query,
      answer: `${answerBase}\n\n(Demo mode response — served from canned data, not the live RAG pipeline.)`,
      citations: cited.map((chunk) => ({
        documentId: chunk.documentId,
        documentName:
          documents.find((doc) => doc.id === chunk.documentId)?.fileName ?? 'unknown-document',
        chunkId: chunk.id,
        chunkIndex: chunk.chunkIndex,
      })),
    };
  },
};

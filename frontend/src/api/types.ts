export type DocumentStatus = 'UPLOADED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type UserRole = 'USER' | 'KNOWLEDGE_MANAGER' | 'ADMIN';

export type MessageRole = 'USER' | 'ASSISTANT';

export interface UserProfile {
  id: number;
  email: string;
  username: string;
  userRole: UserRole;
  active: boolean;
  departmentIds?: number[] | null;
}

export interface UserSummary {
  id: number;
  username: string;
  email: string;
  userRole: UserRole;
  active: boolean;
}

export interface UserProfileResponse {
  id: number;
  email: string;
  username: string;
  userRole: UserRole;
  active: boolean;
  departmentIds?: number[] | Set<number> | null;
}

export interface AuthResponse {
  token: string;
  user: UserProfile | UserProfileResponse;
}

export interface SendChatMessageRequest {
  sessionId?: number | null;
  message: string;
  userMessageId?: number | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface Document {
  id: number;
  fileName: string;
  contentType?: string | null;
  minioObjectKey?: string | null;
  fileSize?: number | null;
  documentStatus: DocumentStatus;
  ownerId?: number | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  createdAt?: string | null;
}

export interface DocumentChunk {
  id: number;
  documentId: number;
  chunkIndex: number;
  content: string;
  tokenCount?: number | null;
}

export interface FileContent {
  fileName: string;
  contentType?: string | null;
  content: string;
}

export interface Citation {
  documentId: number;
  documentName: string;
  chunkId: number;
  chunkIndex: number;
}

export interface ChatMessage {
  id: number;
  role: MessageRole | string;
  content: string;
  citations?: Citation[] | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | null;
}

export interface ChatSession {
  id: number;
  title?: string | null;
  messages?: ChatMessage[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ChatMessageResponse {
  sessionId: number;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  title?: string | null;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  userRole: UserRole;
  password?: string;
  departmentIds?: number[];
}

export interface Department {
  id: number;
  name: string;
  description?: string | null;
  createdAt?: string | null;
  active?: boolean | null;
  userCount?: number | null;
}

export interface ChangeUserRoleRequest {
  userRole: UserRole;
}

export interface ChangeUserStatusRequest {
  active: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface PasswordMessage {
  message: string;
}

export interface ApiFieldError {
  field?: string;
  message?: string;
}

export interface ApiErrorPayload {
  status?: string;
  message?: string;
  timeStamp?: string;
  errors?: ApiFieldError[] | null;
}

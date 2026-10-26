import type { UserProfile } from '../api/types';

export function isAdmin(user: UserProfile | null | undefined): boolean {
  return user?.userRole === 'ADMIN';
}

export function canManageDocs(user: UserProfile | null | undefined): boolean {
  return user?.userRole === 'ADMIN';
}

export function canManageUsers(user: UserProfile | null | undefined): boolean {
  return user?.userRole === 'ADMIN';
}

export function isKnowledgeManager(user: UserProfile | null | undefined): boolean {
  return user?.userRole === 'KNOWLEDGE_MANAGER';
}

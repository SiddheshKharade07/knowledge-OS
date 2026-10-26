import { http } from './client';
import type {
  ChangeUserRoleRequest,
  ChangeUserStatusRequest,
  CreateUserRequest,
  Page,
  UserProfile,
  UserSummary,
} from './types';

export const usersApi = {
  list: async (page = 0, size = 50): Promise<Page<UserSummary & { departmentIds?: number[] | null }>> => {
    const res = await http.get<Page<UserSummary & { departmentIds?: number[] | null }>>('/admin/users', { params: { page, size } });
    return res.data;
  },
  create: async (data: CreateUserRequest): Promise<UserProfile> => {
    const res = await http.post<UserProfile>('/admin/users', data);
    return res.data;
  },
  get: async (id: number): Promise<UserProfile> => {
    const res = await http.get<UserProfile>(`/admin/users/${id}`);
    return res.data;
  },
  update: async (id: number, data: Partial<CreateUserRequest>): Promise<UserProfile> => {
    const res = await http.put<UserProfile>(`/admin/users/${id}`, data).catch(async () => {
      const res2 = await http.patch<UserProfile>(`/admin/users/${id}`, data);
      return res2;
    });
    return res.data;
  },
  changeRole: async (id: number, data: ChangeUserRoleRequest): Promise<UserProfile> => {
    const res = await http.patch<UserProfile>(`/admin/users/${id}/role`, data);
    return res.data;
  },
  changeStatus: async (id: number, data: ChangeUserStatusRequest): Promise<UserProfile> => {
    const res = await http.patch<UserProfile>(`/admin/users/${id}/status`, data);
    return res.data;
  },
  delete: async (id: number): Promise<void> => {
    await http.delete(`/admin/users/${id}`);
  },
};

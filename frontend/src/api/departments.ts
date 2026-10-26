import { http } from './client';
import type { Department } from './types';

export const departmentsApi = {
  list: async (): Promise<Department[]> => {
    const res = await http.get<Department[]>('/departments');
    return res.data;
  },
  get: async (id: number): Promise<Department> => {
    // Backend supports get by name via /{departmentName}, but we can also fetch all
    const list = await departmentsApi.list();
    const found = list.find((d) => d.id === id);
    if (found) return found;
    const res = await http.get<Department[]>(`/departments`);
    const departments = res.data;
    const dept = departments.find((d) => d.id === id);
    if (dept) return dept;
    throw new Error('Department not found');
  },
  getByName: async (name: string): Promise<Department> => {
    const res = await http.get<Department>(`/departments/${encodeURIComponent(name)}`);
    return res.data;
  },
  create: async (data: { name: string; description?: string }): Promise<Department> => {
    const res = await http.post<Department>('/departments', { name: data.name });
    return res.data;
  },
  update: async (id: number, data: { name: string; description?: string }): Promise<Department> => {
    const res = await http.put<Department>(`/departments/${id}`, { name: data.name });
    return res.data;
  },
  delete: async (id: number): Promise<void> => {
    await http.delete(`/departments/${id}`);
  },
};

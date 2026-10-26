import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import * as React from 'react';
import { departmentsApi } from '../api/departments';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { toast } from 'sonner';
import type { Department } from '../api/types';

export default function DepartmentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Department | null>(null);
  const [form, setForm] = React.useState({ name: '' });

  const departmentsQuery = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: () => departmentsApi.create({ name: form.name.trim() }),
    onSuccess: () => {
      toast.success('Department created');
      setCreateOpen(false);
      setForm({ name: '' });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create department'),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error('No department selected');
      return departmentsApi.update(editing.id, { name: form.name.trim() });
    },
    onSuccess: () => {
      toast.success('Department updated');
      setEditOpen(false);
      setEditing(null);
      setForm({ name: '' });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update department'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => departmentsApi.delete(id),
    onSuccess: () => {
      toast.success('Department deleted');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to delete department'),
  });

  const departments: Department[] = departmentsQuery.data ?? [];
  const filtered = departments.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return d.name.toLowerCase().includes(q) || String(d.id).includes(q);
  });

  const openCreate = () => {
    setForm({ name: '' });
    setCreateOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditing(dept);
    setForm({ name: dept.name });
    setEditOpen(true);
  };

  const handleDelete = (dept: Department) => {
    if (confirm(`Delete department "${dept.name}"? This action may be blocked if it has assigned users or documents.`)) {
      deleteMutation.mutate(dept.id);
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
            <span>Admin Console</span>
            <span>/</span>
            <span className="text-[#5145E5]">Departments</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-on-surface">Departments</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Organize users and control document access by department.</p>
        </div>
        <Button onClick={openCreate} className="h-[46px] bg-gradient-to-r from-[#5145E5] to-[#6d5efc] shadow-card">
          <Plus className="h-4 w-4" />
          Create department
        </Button>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-outline-variant/50 bg-surface-container-lowest px-3 shadow-card">
        <Search className="h-4 w-4 text-on-surface-variant" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search departments..."
          className="border-0 bg-transparent shadow-none focus:ring-0"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-outline-variant/50 bg-white shadow-[0_1px_1px_rgba(15,23,42,0.02),0_10px_40px_rgba(81,69,229,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/40 bg-surface-container-low">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-on-surface-variant">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-on-surface-variant">ID</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-on-surface-variant">Actions</th>
              </tr>
            </thead>
            <tbody>
              {departmentsQuery.isLoading ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center">
                    <Spinner className="mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center gap-2">
                      <Building2 className="h-6 w-6" />
                      <p>No departments found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((dept) => (
                  <tr key={dept.id} className="border-b border-outline-variant/30 last:border-0">
                    <td className="px-4 py-3 font-medium text-on-surface">{dept.name}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{dept.id}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(dept)}>
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(dept)} disabled={deleteMutation.isPending}>
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)}>
        <ModalHeader title="Create department" description="Add a new department to organize users." onClose={() => setCreateOpen(false)} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name.trim()) {
              toast.error('Department name is required');
              return;
            }
            createMutation.mutate();
          }}
        >
          <ModalBody className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-on-surface">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Engineering"
                required
                className="h-[46px]"
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !form.name.trim()} className="h-[46px]">
              {createMutation.isPending ? <Spinner className="text-on-primary" /> : null}
              Create
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)}>
        <ModalHeader title="Edit department" description="Update department details." onClose={() => setEditOpen(false)} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name.trim()) {
              toast.error('Department name is required');
              return;
            }
            updateMutation.mutate();
          }}
        >
          <ModalBody className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-on-surface">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Engineering"
                required
                className="h-[46px]"
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setEditOpen(false)} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending || !form.name.trim()} className="h-[46px]">
              {updateMutation.isPending ? <Spinner className="text-on-primary" /> : null}
              Save changes
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}

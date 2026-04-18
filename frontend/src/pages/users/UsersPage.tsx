import { useEffect, useState } from 'react';
import client from '../../api/client';

interface User {
  userId: string; fullName: string; email: string; role: string; department: string;
  isActive: boolean; mustChangePassword: boolean; lastLoginAt: string | null;
}
interface CreateForm { fullName: string; email: string; role: string; department: string; }
const EMPTY: CreateForm = { fullName: '', email: '', role: 'Pharmacist', department: '' };
const ROLES = ['Admin', 'Pharmacist'];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | 'create' | User>(null);
  const [form, setForm] = useState<CreateForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [resetPwd, setResetPwd] = useState('');

  async function load() {
    setLoading(true);
    try { setUsers((await client.get('/users?includeInactive=true')).data); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setForm(EMPTY); setError(''); setModal('create'); }
  function openEdit(u: User) {
    setForm({ fullName: u.fullName, email: u.email, role: u.role, department: u.department ?? '' });
    setError(''); setModal(u);
  }

  async function handleSave() {
    if (!form.fullName.trim() || !form.email.trim()) { setError('Name and email are required.'); return; }
    setSaving(true);
    try {
      if (modal === 'create') await client.post('/users', form);
      else await client.put(`/users/${(modal as User).userId}`, form);
      setModal(null); load();
    } catch { setError('Save failed.'); }
    finally { setSaving(false); }
  }

  async function handleToggle(u: User) {
    if (u.isActive) {
      if (!confirm(`Deactivate ${u.fullName}?`)) return;
      await client.delete(`/users/${u.userId}`);
    } else {
      await client.post(`/users/${u.userId}/reactivate`);
    }
    load();
  }

  async function handleReset(u: User) {
    const pwd = prompt(`New temporary password for ${u.fullName}:`);
    if (!pwd) return;
    try {
      await client.post(`/users/${u.userId}/reset-password`, { newPassword: pwd });
      setResetPwd(`Password reset for ${u.fullName}.`);
      setTimeout(() => setResetPwd(''), 4000);
    } catch { alert('Reset failed.'); }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Staff Users</h1>
        <button onClick={openCreate} className="btn-primary text-sm px-4 py-2 rounded-lg">+ Add Staff</button>
      </div>
      {resetPwd && <div className="bg-green-50 text-green-700 rounded-lg px-4 py-2 text-sm">{resetPwd}</div>}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-400 text-sm">Loading…</div> :
          users.length === 0 ? <div className="p-8 text-center text-gray-400 text-sm">No users found.</div> : (
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-left">
                {['Name', 'Email', 'Role', 'Department', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.userId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{u.fullName}</span>
                      {u.mustChangePassword && <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">pwd reset</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 text-gray-700">{u.role}</td>
                    <td className="px-4 py-3 text-gray-500">{u.department || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex gap-3">
                      <button onClick={() => openEdit(u)} className="text-green-700 hover:text-green-900 text-xs font-medium">Edit</button>
                      <button onClick={() => handleReset(u)} className="text-gray-500 hover:text-gray-700 text-xs">Reset Pwd</button>
                      <button onClick={() => handleToggle(u)} className={`text-xs ${u.isActive ? 'text-red-500 hover:text-red-700' : 'text-blue-500 hover:text-blue-700'}`}>
                        {u.isActive ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {modal !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">{modal === 'create' ? 'Add Staff' : 'Edit Staff'}</h2>
            {([['fullName', 'Full Name'], ['email', 'Email'], ['department', 'Department']] as [keyof CreateForm, string][]).map(([field, label]) => (
              <div key={field}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input type={field === 'email' ? 'email' : 'text'} value={form[field]}
                  onChange={e => { setForm(f => ({ ...f, [field]: e.target.value })); setError(''); }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2">
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setModal(null)} className="text-sm text-gray-600">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary text-sm px-5 py-2 rounded-lg disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

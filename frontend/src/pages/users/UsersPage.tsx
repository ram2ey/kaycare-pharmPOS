import { useEffect, useState } from 'react';
import {
  getUsers, createUser, updateUser, deactivateUser, reactivateUser, resetPassword,
  type UserResponse,
} from '../../api/users';

const ROLES = [
  { label: 'Admin',      roleId: 2 },
  { label: 'Pharmacist', roleId: 3 },
];

const TEMP_PWD = `Welcome@${new Date().getFullYear()}!`;

interface CreateForm { email: string; firstName: string; lastName: string; roleId: number; department: string; }
interface EditForm   { firstName: string; lastName: string; roleId: number; department: string; }

const EMPTY_CREATE: CreateForm = { email: '', firstName: '', lastName: '', roleId: 3, department: '' };

export default function UsersPage() {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | 'create' | UserResponse>(null);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [editForm, setEditForm] = useState<EditForm>({ firstName: '', lastName: '', roleId: 3, department: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  async function load() {
    setLoading(true);
    try { setUsers(await getUsers(true)); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 4000); }

  function openCreate() { setCreateForm(EMPTY_CREATE); setError(''); setModal('create'); }
  function openEdit(u: UserResponse) {
    setEditForm({ firstName: u.firstName, lastName: u.lastName, roleId: u.roleId, department: u.department ?? '' });
    setError(''); setModal(u);
  }

  async function handleCreate() {
    if (!createForm.email.trim() || !createForm.firstName.trim() || !createForm.lastName.trim()) {
      setError('Email, first name, and last name are required.'); return;
    }
    setSaving(true);
    try {
      await createUser({ ...createForm, password: TEMP_PWD });
      setModal(null);
      showToast(`User created. Temp password: ${TEMP_PWD}`);
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to create user.');
    } finally { setSaving(false); }
  }

  async function handleEdit() {
    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      setError('First and last name are required.'); return;
    }
    setSaving(true);
    try {
      await updateUser((modal as UserResponse).userId, editForm);
      setModal(null); load();
    } catch { setError('Failed to update user.'); }
    finally { setSaving(false); }
  }

  async function handleToggle(u: UserResponse) {
    if (!confirm(`${u.isActive ? 'Deactivate' : 'Reactivate'} ${u.fullName}?`)) return;
    try {
      u.isActive ? await deactivateUser(u.userId) : await reactivateUser(u.userId);
      load();
    } catch { alert('Action failed.'); }
  }

  async function handleReset(u: UserResponse) {
    if (!confirm(`Reset password for ${u.fullName} to "${TEMP_PWD}"?`)) return;
    try {
      await resetPassword(u.userId, TEMP_PWD);
      showToast(`Password reset. New temp password: ${TEMP_PWD}`);
    } catch { alert('Reset failed.'); }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Staff Users</h1>
        <button onClick={openCreate}
          className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-sm font-medium rounded-lg transition-colors">
          + Add Staff
        </button>
      </div>

      {toast && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm font-medium">
          {toast}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-400 text-sm">Loading…</div> :
          users.length === 0 ? <div className="p-8 text-center text-gray-400 text-sm">No users found.</div> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                  {['Name', 'Email', 'Role', 'Department', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.userId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{u.fullName}</span>
                      {u.mustChangePassword && (
                        <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">pwd reset</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 text-gray-700">{u.role}</td>
                    <td className="px-4 py-3 text-gray-500">{u.department || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex gap-3 items-center">
                      <button onClick={() => openEdit(u)} className="text-green-700 hover:text-green-900 text-xs font-medium">Edit</button>
                      <button onClick={() => handleReset(u)} className="text-gray-500 hover:text-gray-700 text-xs font-medium">Reset Pwd</button>
                      <button onClick={() => handleToggle(u)}
                        className={`text-xs font-medium ${u.isActive ? 'text-red-500 hover:text-red-700' : 'text-blue-500 hover:text-blue-700'}`}>
                        {u.isActive ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {/* Create modal */}
      {modal === 'create' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Add Staff</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
                <input type="text" value={createForm.firstName}
                  onChange={e => setCreateForm(f => ({ ...f, firstName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Last Name *</label>
                <input type="text" value={createForm.lastName}
                  onChange={e => setCreateForm(f => ({ ...f, lastName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                <input type="email" value={createForm.email}
                  onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select value={createForm.roleId}
                  onChange={e => setCreateForm(f => ({ ...f, roleId: parseInt(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  {ROLES.map(r => <option key={r.roleId} value={r.roleId}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
                <input type="text" value={createForm.department}
                  onChange={e => setCreateForm(f => ({ ...f, department: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg px-4 py-2.5 text-sm text-gray-600">
              Temp password: <span className="font-mono font-medium text-gray-800">{TEMP_PWD}</span>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => setModal(null)} className="text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleCreate} disabled={saving}
                className="px-5 py-2 bg-green-700 hover:bg-green-800 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                {saving ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {modal !== null && modal !== 'create' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Edit — {(modal as UserResponse).fullName}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
                <input type="text" value={editForm.firstName}
                  onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Last Name *</label>
                <input type="text" value={editForm.lastName}
                  onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select value={editForm.roleId}
                  onChange={e => setEditForm(f => ({ ...f, roleId: parseInt(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  {ROLES.map(r => <option key={r.roleId} value={r.roleId}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
                <input type="text" value={editForm.department}
                  onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => setModal(null)} className="text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleEdit} disabled={saving}
                className="px-5 py-2 bg-green-700 hover:bg-green-800 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

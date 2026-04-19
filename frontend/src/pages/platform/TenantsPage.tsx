import { useEffect, useState } from 'react';
import {
  getTenants, createTenant, updateTenant, activateTenant, deactivateTenant, deleteTenant,
} from '../../api/tenants';
import { useAuth } from '../../contexts/AuthContext';
import type { TenantResponse, CreateTenantRequest, UpdateTenantRequest } from '../../types/tenants';
import { SUBSCRIPTION_PLANS } from '../../types/tenants';

const DEFAULT_CREATE: CreateTenantRequest = {
  tenantCode: '', tenantName: '', subscriptionPlan: 'Standard',
  maxUsers: 50, storageQuotaGB: 100,
  adminEmail: '', adminFirstName: '', adminLastName: '',
};

export default function TenantsPage() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<TenantResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | 'create' | TenantResponse>(null);
  const [createForm, setCreateForm] = useState<CreateTenantRequest>(DEFAULT_CREATE);
  const [editForm, setEditForm] = useState<UpdateTenantRequest>({ tenantName: '', subscriptionPlan: 'Standard', maxUsers: 50, storageQuotaGB: 100 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try { setTenants(await getTenants()); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setCreateForm(DEFAULT_CREATE); setError(''); setModal('create');
  }

  function openEdit(t: TenantResponse) {
    setEditForm({ tenantName: t.tenantName, subscriptionPlan: t.subscriptionPlan, maxUsers: t.maxUsers, storageQuotaGB: t.storageQuotaGB });
    setError(''); setModal(t);
  }

  async function handleCreate() {
    if (!createForm.tenantCode.trim() || !createForm.tenantName.trim() || !createForm.adminEmail.trim()) {
      setError('Tenant code, name, and admin email are required.'); return;
    }
    setSaving(true);
    try {
      await createTenant(createForm);
      setModal(null); load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to create tenant.');
    } finally { setSaving(false); }
  }

  async function handleEdit() {
    if (!editForm.tenantName.trim()) { setError('Tenant name is required.'); return; }
    setSaving(true);
    try {
      await updateTenant((modal as TenantResponse).tenantId, editForm);
      setModal(null); load();
    } catch { setError('Failed to update tenant.'); }
    finally { setSaving(false); }
  }

  async function handleToggle(t: TenantResponse) {
    if (!confirm(`${t.isActive ? 'Deactivate' : 'Activate'} ${t.tenantName}?`)) return;
    try {
      t.isActive ? await deactivateTenant(t.tenantId) : await activateTenant(t.tenantId);
      load();
    } catch { alert('Failed to update tenant status.'); }
  }

  async function handleDelete(t: TenantResponse) {
    if (!confirm(`Permanently delete "${t.tenantName}" and ALL its data? This cannot be undone.`)) return;
    if (!confirm(`Second confirmation: delete all users and records for "${t.tenantName}"?`)) return;
    try {
      await deleteTenant(t.tenantId);
      load();
    } catch { alert('Failed to delete tenant.'); }
  }

  const isOwnTenant = (t: TenantResponse) => t.tenantCode === user?.tenantCode;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Tenants</h1>
          <p className="text-sm text-gray-500 mt-0.5">All pharmacy accounts on this platform.</p>
        </div>
        <button onClick={openCreate}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium rounded-lg transition-colors">
          + New Tenant
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-400">Loading…</div> :
          tenants.length === 0 ? <div className="p-8 text-center text-gray-400 text-sm">No tenants yet.</div> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                  {['Tenant', 'Code', 'Plan', 'Users', 'Storage', 'Status', 'Created', ''].map(h => (
                    <th key={h} className="px-5 py-3 font-medium text-gray-600 text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenants.map(t => (
                  <tr key={t.tenantId} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{t.tenantName}</td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{t.tenantCode}</td>
                    <td className="px-5 py-3 text-gray-600">{t.subscriptionPlan}</td>
                    <td className="px-5 py-3 text-gray-600">{t.userCount} / {t.maxUsers}</td>
                    <td className="px-5 py-3 text-gray-600">{t.storageQuotaGB} GB</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {t.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3 flex gap-3 items-center">
                      <button onClick={() => openEdit(t)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                      {!isOwnTenant(t) && (
                        <>
                          <button onClick={() => handleToggle(t)}
                            className={`text-xs font-medium ${t.isActive ? 'text-amber-600 hover:text-amber-800' : 'text-green-600 hover:text-green-800'}`}>
                            {t.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button onClick={() => handleDelete(t)}
                            className="text-red-500 hover:text-red-700 text-xs font-medium">
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {/* Create modal */}
      {modal === 'create' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-6 space-y-5 my-4">
            <h2 className="text-lg font-semibold text-gray-900">New Tenant</h2>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Account Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tenant Name *</label>
                  <input type="text" value={createForm.tenantName}
                    onChange={e => setCreateForm(f => ({ ...f, tenantName: e.target.value }))}
                    placeholder="e.g. MedPlus Pharmacy"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tenant Code * <span className="text-gray-400 font-normal">(unique, lowercase)</span></label>
                  <input type="text" value={createForm.tenantCode}
                    onChange={e => setCreateForm(f => ({ ...f, tenantCode: e.target.value.toLowerCase().replace(/\s/g, '') }))}
                    placeholder="e.g. medplus"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Plan</label>
                  <select value={createForm.subscriptionPlan}
                    onChange={e => setCreateForm(f => ({ ...f, subscriptionPlan: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500">
                    {SUBSCRIPTION_PLANS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Max Users</label>
                  <input type="number" min={1} value={createForm.maxUsers}
                    onChange={e => setCreateForm(f => ({ ...f, maxUsers: parseInt(e.target.value) || 50 }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Storage (GB)</label>
                  <input type="number" min={1} value={createForm.storageQuotaGB}
                    onChange={e => setCreateForm(f => ({ ...f, storageQuotaGB: parseInt(e.target.value) || 100 }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500" />
                </div>
              </div>
            </div>

            <div className="space-y-1 border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">First Admin User</p>
              <p className="text-xs text-gray-400">A temporary password will be set — they must change it on first login.</p>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Admin Email *</label>
                  <input type="email" value={createForm.adminEmail}
                    onChange={e => setCreateForm(f => ({ ...f, adminEmail: e.target.value }))}
                    placeholder="admin@pharmacy.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
                  <input type="text" value={createForm.adminFirstName}
                    onChange={e => setCreateForm(f => ({ ...f, adminFirstName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
                  <input type="text" value={createForm.adminLastName}
                    onChange={e => setCreateForm(f => ({ ...f, adminLastName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500" />
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => setModal(null)} className="text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleCreate} disabled={saving}
                className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                {saving ? 'Creating…' : 'Create Tenant'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {modal !== null && modal !== 'create' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Edit — {(modal as TenantResponse).tenantName}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Tenant Name *</label>
                <input type="text" value={editForm.tenantName}
                  onChange={e => setEditForm(f => ({ ...f, tenantName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Plan</label>
                <select value={editForm.subscriptionPlan}
                  onChange={e => setEditForm(f => ({ ...f, subscriptionPlan: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500">
                  {SUBSCRIPTION_PLANS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Max Users</label>
                <input type="number" min={1} value={editForm.maxUsers}
                  onChange={e => setEditForm(f => ({ ...f, maxUsers: parseInt(e.target.value) || 50 }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Storage (GB)</label>
                <input type="number" min={1} value={editForm.storageQuotaGB}
                  onChange={e => setEditForm(f => ({ ...f, storageQuotaGB: parseInt(e.target.value) || 100 }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500" />
              </div>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => setModal(null)} className="text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleEdit} disabled={saving}
                className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

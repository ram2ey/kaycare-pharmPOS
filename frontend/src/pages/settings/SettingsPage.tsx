import { useEffect, useRef, useState } from 'react';
import client from '../../api/client';

interface Settings {
  facilityName: string; address: string; phone: string; email: string; logoUrl: string | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState({ facilityName: '', address: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const data = (await client.get('/facility-settings')).data as Settings;
      setSettings(data);
      setForm({ facilityName: data.facilityName ?? '', address: data.address ?? '', phone: data.phone ?? '', email: data.email ?? '' });
    } catch { /* no settings yet */ }
  }

  useEffect(() => { load(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await client.put('/facility-settings', form);
      setMsg('Settings saved.');
      load();
    } catch { setMsg('Save failed.'); }
    finally { setSaving(false); }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    try {
      await client.post('/facility-settings/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMsg('Logo uploaded.'); load();
    } catch { setMsg('Logo upload failed.'); }
  }

  async function handleDeleteLogo() {
    if (!confirm('Remove logo?')) return;
    await client.delete('/facility-settings/logo');
    setMsg('Logo removed.'); load();
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Facility Settings</h1>

      {/* Logo */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Pharmacy Logo</h2>
        {settings?.logoUrl && (
          <img src={settings.logoUrl} alt="Logo" className="h-16 object-contain rounded" />
        )}
        <div className="flex gap-3">
          <button onClick={() => fileRef.current?.click()} className="btn-outline text-sm px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">
            {settings?.logoUrl ? 'Change Logo' : 'Upload Logo'}
          </button>
          {settings?.logoUrl && (
            <button onClick={handleDeleteLogo} className="text-sm text-red-600 hover:text-red-800">Remove</button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleLogoUpload} />
      </div>

      {/* Details */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Pharmacy Details</h2>
        <form onSubmit={handleSave} className="space-y-4">
          {([['facilityName', 'Pharmacy Name'], ['address', 'Address'], ['phone', 'Phone'], ['email', 'Email']] as [keyof typeof form, string][]).map(([field, label]) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input type={field === 'email' ? 'email' : 'text'} value={form[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2" />
            </div>
          ))}
          {msg && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-4 py-2">{msg}</p>}
          <button type="submit" disabled={saving} className="btn-primary text-sm px-6 py-2.5 rounded-lg disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}

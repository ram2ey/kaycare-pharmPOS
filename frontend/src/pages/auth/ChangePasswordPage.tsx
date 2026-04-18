import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { changePassword } from '../../api/auth';

export default function ChangePasswordPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.next !== form.confirm) { setError('Passwords do not match.'); return; }
    if (form.next.length < 8) { setError('New password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await changePassword(form.current, form.next);
      logout();
      navigate('/login', { replace: true });
    } catch {
      setError('Failed to change password. Check your current password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f0fdf4' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Change your password</h1>
          {user?.mustChangePassword && (
            <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-4 py-2 mt-3">
              You must change your password before continuing.
            </p>
          )}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {['current', 'next', 'confirm'].map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field === 'current' ? 'Current password' : field === 'next' ? 'New password' : 'Confirm new password'}
                </label>
                <input
                  type="password"
                  value={form[field as keyof typeof form]}
                  onChange={(e) => { setForm((f) => ({ ...f, [field]: e.target.value })); setError(''); }}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2"
                />
              </div>
            ))}
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
              style={{ background: '#15803d' }}
            >
              {loading ? 'Saving…' : 'Change password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

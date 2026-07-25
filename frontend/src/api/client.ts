import axios from 'axios';

let rawApiUrl = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '');
if (rawApiUrl && !rawApiUrl.startsWith('http://') && !rawApiUrl.startsWith('https://')) {
  rawApiUrl = `https://${rawApiUrl}`;
}
const apiBaseUrl = rawApiUrl ? (rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`) : '/api';

const client = axios.create({ baseURL: apiBaseUrl });

client.interceptors.request.use((config) => {
  const raw = localStorage.getItem('pharmos_auth');
  if (raw) {
    const auth = JSON.parse(raw) as { token: string; tenantCode: string };
    config.headers['Authorization'] = `Bearer ${auth.token}`;
    config.headers['X-Tenant-Code'] = auth.tenantCode;
  }
  return config;
});

client.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('pharmos_auth');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default client;

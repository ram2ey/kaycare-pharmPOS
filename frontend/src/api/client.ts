import axios from 'axios';

const client = axios.create({ baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api` });

client.interceptors.request.use((config) => {
  const raw = localStorage.getItem('pharmos_auth');
  if (raw) {
    const auth = JSON.parse(raw) as { token: string; tenantCode: string };
    config.headers['Authorization'] = `Bearer ${auth.token}`;
    config.headers['X-Tenant-Code'] = auth.tenantCode;
  }
  return config;
});

export default client;

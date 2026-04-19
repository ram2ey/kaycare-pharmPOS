import client from './client';
import type { LoginRequest } from '../types';

export async function login(req: LoginRequest) {
  const res = await client.post('/auth/login', req, {
    headers: { 'X-Tenant-Code': req.tenantCode },
  });
  return res.data as {
    token: string;
    expiresAt: string;
    userId: string;
    email: string;
    fullName: string;
    role: string;
    mustChangePassword: boolean;
    tenantType: string;
  };
}

export async function changePassword(currentPassword: string, newPassword: string) {
  await client.post('/auth/change-password', { currentPassword, newPassword });
}

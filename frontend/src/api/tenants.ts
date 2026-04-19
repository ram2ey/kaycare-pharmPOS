import client from './client';
import type { TenantResponse, CreateTenantRequest, UpdateTenantRequest } from '../types/tenants';

export const getTenants = () =>
  client.get<TenantResponse[]>('/tenants').then(r => r.data);

export const createTenant = (req: CreateTenantRequest) =>
  client.post<TenantResponse>('/tenants', req).then(r => r.data);

export const updateTenant = (id: string, req: UpdateTenantRequest) =>
  client.put<TenantResponse>(`/tenants/${id}`, req).then(r => r.data);

export const activateTenant = (id: string) =>
  client.post<TenantResponse>(`/tenants/${id}/activate`).then(r => r.data);

export const deactivateTenant = (id: string) =>
  client.post<TenantResponse>(`/tenants/${id}/deactivate`).then(r => r.data);

export const deleteTenant = (id: string) =>
  client.delete(`/tenants/${id}`);

import client from './client';
import type { CustomerResponse, SaveCustomerRequest, SaleSummaryResponse } from '../types';

export async function getCustomers(search?: string) {
  const res = await client.get('/pharmacy/customers', { params: { search } });
  return res.data as CustomerResponse[];
}

export async function getCustomer(id: string) {
  const res = await client.get(`/pharmacy/customers/${id}`);
  return res.data as CustomerResponse;
}

export async function createCustomer(req: SaveCustomerRequest) {
  const res = await client.post('/pharmacy/customers', req);
  return res.data as CustomerResponse;
}

export async function updateCustomer(id: string, req: SaveCustomerRequest) {
  const res = await client.put(`/pharmacy/customers/${id}`, req);
  return res.data as CustomerResponse;
}

export async function deactivateCustomer(id: string) {
  await client.delete(`/pharmacy/customers/${id}`);
}

export async function getCustomerSales(id: string) {
  const res = await client.get(`/pharmacy/customers/${id}/sales`);
  return res.data as SaleSummaryResponse[];
}

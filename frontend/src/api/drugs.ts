import client from './client';
import type { DrugResponse } from '../types';

export async function getDrugs(params?: { search?: string; activeOnly?: boolean; lowStock?: boolean; category?: string }) {
  const res = await client.get('/pharmacy/drugs', { params });
  return res.data as DrugResponse[];
}

export async function getDrug(id: string) {
  const res = await client.get(`/pharmacy/drugs/${id}`);
  return res.data as DrugResponse;
}

export async function createDrug(data: object) {
  const res = await client.post('/pharmacy/drugs', data);
  return res.data as DrugResponse;
}

export async function updateDrug(id: string, data: object) {
  const res = await client.put(`/pharmacy/drugs/${id}`, data);
  return res.data as DrugResponse;
}

export async function getDrugMovements(id: string) {
  const res = await client.get(`/pharmacy/drugs/${id}/movements`);
  return res.data as { movementType: string; quantity: number; newStock: number; notes: string; createdAt: string }[];
}

export async function addMovement(id: string, data: { movementType: string; quantity: number; notes?: string }) {
  const res = await client.post(`/pharmacy/drugs/${id}/movements`, data);
  return res.data;
}

export async function getReorderAlerts() {
  const res = await client.get('/pharmacy/reorder-alerts');
  return res.data as { drugInventoryId: string; name: string; currentStock: number; reorderThreshold: number; deficit: number; category?: string }[];
}

export async function seedCatalog() {
  const res = await client.post('/pharmacy/drugs/seed-catalog');
  return res.data as { added: number };
}

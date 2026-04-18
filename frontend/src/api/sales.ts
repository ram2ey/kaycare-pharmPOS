import client from './client';
import type {
  CreateSaleRequest,
  DailySalesSummaryResponse,
  SaleDetailResponse,
  SaleSummaryResponse,
  SalesReportResponse,
} from '../types';

export async function getSales(params?: { from?: string; to?: string }) {
  const res = await client.get('/pharmacy/sales', { params });
  return res.data as SaleSummaryResponse[];
}

export async function getSale(id: string) {
  const res = await client.get(`/pharmacy/sales/${id}`);
  return res.data as SaleDetailResponse;
}

export async function createSale(req: CreateSaleRequest) {
  const res = await client.post('/pharmacy/sales', req);
  return res.data as SaleDetailResponse;
}

export async function voidSale(id: string, reason: string) {
  const res = await client.post(`/pharmacy/sales/${id}/void`, { reason });
  return res.data as SaleDetailResponse;
}

export async function getDailySummary(date?: string) {
  const res = await client.get('/pharmacy/sales/summary', { params: { date } });
  return res.data as DailySalesSummaryResponse;
}

export function receiptUrl(id: string) {
  return `${import.meta.env.VITE_API_URL ?? ''}/api/pharmacy/sales/${id}/receipt`;
}

export async function getSalesReport(params?: { from?: string; to?: string }) {
  const res = await client.get('/pharmacy/sales/report', { params });
  return res.data as SalesReportResponse;
}

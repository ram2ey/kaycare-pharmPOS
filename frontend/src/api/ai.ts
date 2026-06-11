import apiClient from './client';

export interface DrugSafetyResponse {
  interactions: string;
}

export const getDrugSafety = (items: Array<{ drugName: string; genericName: string; dosage: string; quantity: number }>) =>
  apiClient.post<DrugSafetyResponse>('/ai/drug-safety', { items }).then((r) => r.data);

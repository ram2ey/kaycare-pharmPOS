import apiClient from './client';

export interface DrugSafetyResponse {
  interactions: string;
}

export interface ExtractedPrescriptionDrug {
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string;
}

export const getDrugSafety = (items: Array<{ drugName: string; genericName: string; dosage: string; quantity: number }>) =>
  apiClient.post<DrugSafetyResponse>('/ai/drug-safety', { items }).then((r) => r.data);

export const parsePrescriptionOcr = (base64Image: string, mimeType?: string) =>
  apiClient.post<ExtractedPrescriptionDrug[]>('/ai/prescription-ocr', { base64Image, mimeType }).then((r) => r.data);

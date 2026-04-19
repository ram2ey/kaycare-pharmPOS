export interface TenantResponse {
  tenantId: string;
  tenantCode: string;
  tenantName: string;
  subscriptionPlan: string;
  isActive: boolean;
  maxUsers: number;
  storageQuotaGB: number;
  userCount: number;
  createdAt: string;
}

export interface CreateTenantRequest {
  tenantCode: string;
  tenantName: string;
  subscriptionPlan: string;
  maxUsers: number;
  storageQuotaGB: number;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
}

export interface UpdateTenantRequest {
  tenantName: string;
  subscriptionPlan: string;
  maxUsers: number;
  storageQuotaGB: number;
}

export const SUBSCRIPTION_PLANS = ['Starter', 'Standard', 'Professional', 'Enterprise'];

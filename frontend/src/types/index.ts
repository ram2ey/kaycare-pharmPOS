export interface AuthUser {
  token: string;
  expiresAt: string;
  userId: string;
  email: string;
  fullName: string;
  role: string;
  mustChangePassword: boolean;
  tenantType: string;
  tenantCode: string;
}

export interface LoginRequest {
  tenantCode: string;
  email: string;
  password: string;
}

// ── Drug inventory ──────────────────────────────────────────────────────────
export interface DrugResponse {
  drugInventoryId: string;
  name: string;
  genericName?: string;
  dosageForm?: string;
  strength?: string;
  unit?: string;
  category?: string;
  currentStock: number;
  reorderThreshold: number;
  unitCost: number;
  sellingPrice: number;
  isControlledSubstance: boolean;
  isActive: boolean;
}

// ── Customer ────────────────────────────────────────────────────────────────
export interface CustomerResponse {
  customerId: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  isActive: boolean;
}

export interface SaveCustomerRequest {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
}

// ── Sale ────────────────────────────────────────────────────────────────────
export interface SaleItemResponse {
  saleItemId: string;
  drugInventoryId?: string;
  drugName: string;
  dosageForm?: string;
  strength?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface SaleSummaryResponse {
  saleId: string;
  saleNumber: string;
  customerName: string;
  paymentMethod: string;
  totalAmount: number;
  paidAmount: number;
  isVoided: boolean;
  soldByName: string;
  saleDate: string;
  itemCount: number;
}

export interface SaleDetailResponse {
  saleId: string;
  saleNumber: string;
  customerId?: string;
  customerName: string;
  paymentMethod: string;
  totalAmount: number;
  discountAmount: number;
  paidAmount: number;
  change: number;
  notes?: string;
  isVoided: boolean;
  voidReason?: string;
  soldByName: string;
  saleDate: string;
  items: SaleItemResponse[];
}

export interface CreateSaleItemRequest {
  drugInventoryId: string;
  quantity: number;
}

export interface CreateSaleRequest {
  customerId?: string;
  customerName?: string;
  paymentMethod: string;
  paidAmount: number;
  discountAmount: number;
  notes?: string;
  items: CreateSaleItemRequest[];
}

export interface DailySalesSummaryResponse {
  date: string;
  totalSales: number;
  totalRevenue: number;
  cashRevenue: number;
  cardRevenue: number;
  mobileMoneyRevenue: number;
  insuranceRevenue: number;
  topDrugs: { drugName: string; totalQuantity: number; totalRevenue: number }[];
}

export interface SalesReportResponse {
  from: string;
  to: string;
  totalSales: number;
  voidedSales: number;
  totalRevenue: number;
  cashRevenue: number;
  cardRevenue: number;
  mobileMoneyRevenue: number;
  insuranceRevenue: number;
  dailyBreakdown: DailySalesSummaryResponse[];
  topDrugs: { drugName: string; totalQuantity: number; totalRevenue: number }[];
}

// ── Cart (local state only) ─────────────────────────────────────────────────
export interface CartItem {
  drugInventoryId: string;
  drugName: string;
  dosageForm?: string;
  strength?: string;
  sellingPrice: number;
  currentStock: number;
  quantity: number;
}

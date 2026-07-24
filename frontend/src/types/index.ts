export interface AuthUser {
  token: string;
  expiresAt: string;
  userId: string;
  email: string;
  fullName: string;
  role: string;
  permissions?: string[];
  mustChangePassword: boolean;
  tenantType: string;
  tenantCode: string;
}

export interface LoginRequest {
  tenantCode: string;
  email: string;
  password: string;
}

export const PERMISSIONS = {
  POS_CHECKOUT: 'pos:checkout',
  POS_DISCOUNT: 'pos:discount',
  POS_VOID: 'pos:void',
  POS_PARK: 'pos:park',
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_MANAGE: 'inventory:manage',
  INVENTORY_PRICE: 'inventory:price',
  CUSTOMERS_VIEW: 'customers:view',
  CUSTOMERS_MANAGE: 'customers:manage',
  CS_REGISTER_VIEW: 'csregister:view',
  CS_REGISTER_AUDIT: 'csregister:audit',
  PROCUREMENT_MANAGE: 'procurement:manage',
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',
  USERS_MANAGE: 'users:manage',
  SETTINGS_MANAGE: 'settings:manage',
} as const;

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
  batchNumber?: string;
  expiryDate?: string;
  isActive: boolean;
}

// ── Customer ────────────────────────────────────────────────────────────────
export interface CustomerResponse {
  customerId: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  allergies?: string[];
  chronicConditions?: string[];
  isActive: boolean;
}

export interface SaveCustomerRequest {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  allergies?: string[];
  chronicConditions?: string[];
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

export interface CartItem {
  drugInventoryId: string;
  drugName: string;
  dosageForm?: string;
  strength?: string;
  sellingPrice: number;
  currentStock: number;
  quantity: number;
}

export interface CreateSaleRequest {
  customerId?: string;
  customerName?: string;
  paymentMethod: string;
  paidAmount: number;
  discountAmount?: number;
  notes?: string;
  items: {
    drugInventoryId?: string;
    quantity: number;
  }[];
}

export interface SaleSummaryResponse {
  saleId: string;
  receiptNumber: string;
  saleNumber: string;
  customerName?: string;
  cashierName: string;
  createdAt: string;
  saleDate: string;
  paymentMethod: string;
  netAmount: number;
  totalAmount: number;
  paidAmount: number;
  itemCount: number;
  isVoided: boolean;
}

export interface SaleResponse {
  saleId: string;
  receiptNumber: string;
  saleNumber: string;
  customerId?: string;
  customerName?: string;
  cashierName: string;
  soldByName: string;
  createdAt: string;
  saleDate: string;
  paymentMethod: string;
  subtotal: number;
  discountAmount: number;
  netAmount: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  change: number;
  notes?: string;
  isVoided: boolean;
  voidReason?: string;
  items: SaleItemResponse[];
}

export interface SaleDetailResponse extends SaleResponse {}

export interface DailyTrendItem {
  date: string;
  totalRevenue: number;
  salesCount: number;
  totalSales: number;
  cashRevenue: number;
  cardRevenue: number;
  mobileMoneyRevenue: number;
  insuranceRevenue: number;
}

export interface SalesReportResponse {
  from: string;
  to: string;
  totalRevenue: number;
  totalSales: number;
  voidedSales: number;
  cashRevenue: number;
  cardRevenue: number;
  mobileMoneyRevenue: number;
  insuranceRevenue: number;
  dailyTrends: DailyTrendItem[];
  dailyBreakdown: DailyTrendItem[];
  topDrugs: {
    drugName: string;
    totalQuantity: number;
    totalRevenue: number;
  }[];
}

export interface DailySalesSummaryResponse {
  totalSales: number;
  totalRevenue: number;
  cashRevenue: number;
  cardRevenue: number;
  mobileMoneyRevenue: number;
  insuranceRevenue: number;
  topDrugs: {
    drugName: string;
    totalQuantity: number;
    totalRevenue: number;
  }[];
}

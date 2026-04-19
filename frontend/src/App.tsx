import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import SuperAdminLayout from './components/SuperAdminLayout';

import LoginPage from './pages/auth/LoginPage';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';
import TenantsPage from './pages/platform/TenantsPage';
import POSPage from './pages/pos/POSPage';
import SalesPage from './pages/sales/SalesPage';
import SaleDetailPage from './pages/sales/SaleDetailPage';
import SalesReportPage from './pages/sales/SalesReportPage';
import CustomersPage from './pages/customers/CustomersPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import InventoryPage from './pages/inventory/InventoryPage';
import ReorderAlertsPage from './pages/reorder/ReorderAlertsPage';
import SuppliersPage from './pages/suppliers/SuppliersPage';
import PurchaseOrdersPage from './pages/purchase-orders/PurchaseOrdersPage';
import PurchaseOrderDetailPage from './pages/purchase-orders/PurchaseOrderDetailPage';
import CSRegisterPage from './pages/cs-register/CSRegisterPage';
import SettingsPage from './pages/settings/SettingsPage';
import UsersPage from './pages/users/UsersPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />

          {/* SuperAdmin platform portal */}
          <Route element={<ProtectedRoute allowedRoles={['SuperAdmin']} />}>
            <Route element={<SuperAdminLayout />}>
              <Route path="/platform/tenants" element={<TenantsPage />} />
            </Route>
          </Route>

          {/* Pharmacy staff routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<Navigate to="/pos" replace />} />
              <Route path="/pos" element={<POSPage />} />
              <Route path="/sales" element={<SalesPage />} />
              <Route path="/sales/report" element={<SalesReportPage />} />
              <Route path="/sales/:id" element={<SaleDetailPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/reorder-alerts" element={<ReorderAlertsPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
              <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
              <Route path="/cs-register" element={<CSRegisterPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/users" element={<UsersPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/pos" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

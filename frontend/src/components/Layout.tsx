import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { getReorderAlerts } from '../api/drugs';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  badge?: number;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    getReorderAlerts()
      .then(alerts => setLowStockCount(alerts.length))
      .catch(() => {});
  }, []);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';

  const NAV: NavItem[] = [
    { to: '/pos',             label: 'Point of Sale',    icon: '🛒' },
    { to: '/sales',           label: 'Sales History',    icon: '🧾' },
    { to: '/dashboard',       label: 'Dashboard',        icon: '📊' },
    { to: '/customers',       label: 'Customers',        icon: '👥' },
    { to: '/inventory',       label: 'Drug Inventory',   icon: '💊' },
    { to: '/reorder-alerts',  label: 'Reorder Alerts',   icon: '⚠️', badge: lowStockCount || undefined },
    { to: '/suppliers',       label: 'Suppliers',        icon: '🏭' },
    { to: '/purchase-orders', label: 'Purchase Orders',  icon: '📦' },
    { to: '/cs-register',     label: 'CS Register',      icon: '🔒' },
  ];

  const ADMIN_NAV: NavItem[] = [
    { to: '/settings', label: 'Facility Settings', icon: '⚙️' },
    { to: '/users',    label: 'Staff Users',        icon: '👤' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col" style={{ background: '#15803d' }}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-green-600">
          <div className="text-white font-bold text-lg leading-tight">KayCare PharmPOS</div>
          <div className="text-green-200 text-xs mt-0.5">Pharmacy Management</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white text-green-800'
                    : 'text-green-100 hover:bg-green-700 hover:text-white'
                }`
              }
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center leading-none">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="pt-3 pb-1 px-3 text-green-300 text-xs font-semibold uppercase tracking-wider">
                Admin
              </div>
              {ADMIN_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-white text-green-800'
                        : 'text-green-100 hover:bg-green-700 hover:text-white'
                    }`
                  }
                >
                  <span className="text-base leading-none">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-green-600">
          <div className="text-green-100 text-xs font-medium truncate">{user?.fullName}</div>
          <div className="text-green-300 text-xs truncate">{user?.role}</div>
          <button
            onClick={handleLogout}
            className="mt-2 text-xs text-green-200 hover:text-white transition-colors"
          >
            Sign out →
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

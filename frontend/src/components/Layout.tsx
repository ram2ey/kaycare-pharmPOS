import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { getReorderAlerts } from '../api/drugs';

interface NavItem {
  to: string;
  label: string;
  adminOnly?: boolean;
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

  const navItems: NavItem[] = [
    { to: '/pos',             label: 'Point of Sale' },
    { to: '/sales',           label: 'Sales History' },
    { to: '/dashboard',       label: 'Dashboard' },
    { to: '/customers',       label: 'Customers' },
    { to: '/inventory',       label: 'Drug Inventory' },
    { to: '/reorder-alerts',  label: 'Reorder Alerts', badge: lowStockCount || undefined },
    { to: '/suppliers',       label: 'Suppliers',       adminOnly: true },
    { to: '/purchase-orders', label: 'Purchase Orders', adminOnly: true },
    { to: '/cs-register',     label: 'CS Register' },
    { to: '/settings',        label: 'Facility Settings', adminOnly: true },
    { to: '/users',           label: 'Staff Users',       adminOnly: true },
  ];

  const visibleNav = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-blue-900 text-white flex flex-col">
        <div className="px-6 py-5 border-b border-blue-800">
          <h1 className="text-xl font-bold tracking-wide">PharmOS</h1>
          <p className="text-blue-300 text-sm mt-1">{user?.tenantCode}</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-6 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-700 text-white font-medium'
                    : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                }`
              }
            >
              <span>{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center leading-none">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-6 py-4 border-t border-blue-800">
          <p className="text-sm text-blue-200 truncate">{user?.fullName}</p>
          <p className="text-xs text-blue-400">{user?.role}</p>
          <Link to="/change-password"
            className="mt-2 block text-xs text-blue-300 hover:text-white transition-colors">
            Change password
          </Link>
          <button
            onClick={handleLogout}
            className="mt-1 w-full text-left text-xs text-blue-300 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

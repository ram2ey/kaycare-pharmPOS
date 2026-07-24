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
    { to: '/pos',            label: 'Point of Sale' },
    { to: '/dashboard',      label: 'Analytics Dashboard' },
    { to: '/sales',          label: 'Sales & Receipts' },
    { to: '/customers',      label: 'Patients & Customers' },
    { to: '/inventory',      label: 'Drug Inventory' },
    { to: '/reorder-alerts', label: 'Reorder Alerts', badge: lowStockCount || undefined },
    { to: '/cs-register',    label: 'CS Controlled Register' },
    { to: '/suppliers',      label: 'Suppliers', adminOnly: true },
    { to: '/purchase-orders',label: 'Purchase Orders', adminOnly: true },
    { to: '/settings',       label: 'Facility Settings', adminOnly: true },
    { to: '/users',          label: 'Staff Management', adminOnly: true },
  ];

  const visibleNav = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900/90 border-r border-slate-800/80 flex flex-col backdrop-blur-xl z-20">
        {/* Brand Header */}
        <div className="px-6 py-5 border-b border-slate-800/80">
          <h1 className="text-lg font-bold tracking-tight text-slate-100 font-heading">
            KayCare <span className="text-emerald-400 font-normal">PharmPOS</span>
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider font-mono">
              {user?.tenantCode || 'Pharmacy Tenant'}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-md shadow-emerald-950/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <span>{item.label}</span>
              {item.badge && item.badge > 0 ? (
                <span className="bg-rose-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                  {item.badge}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center justify-between">
            <div className="truncate max-w-[140px]">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.fullName}</p>
              <p className="text-[10px] text-slate-400 font-mono truncate">{user?.role}</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Link
                to="/change-password"
                className="text-slate-400 hover:text-slate-100 transition-colors"
              >
                Password
              </Link>
              <button
                onClick={handleLogout}
                className="text-rose-400 hover:text-rose-300 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 overflow-y-auto bg-slate-950">
        <Outlet />
      </main>
    </div>
  );
}

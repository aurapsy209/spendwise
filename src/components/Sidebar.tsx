import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Target,
  BarChart2,
  Wallet,
  Menu,
  X,
  LogOut,
  Cloud,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { ActiveView } from '../types';
import { useAppContext } from '../hooks/useAppContext';

interface NavItem {
  id: ActiveView;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard size={20} />,
    description: 'Overview & charts',
  },
  {
    id: 'expenses',
    label: 'Expenses',
    icon: <Receipt size={20} />,
    description: 'All transactions',
  },
  {
    id: 'budgets',
    label: 'Budgets',
    icon: <Target size={20} />,
    description: 'Spending limits',
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: <BarChart2 size={20} />,
    description: 'Analytics & export',
  },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  onSignOut: () => void;
  userEmail: string;
}

export function Sidebar({ mobileOpen, onMobileClose, onSignOut, userEmail }: SidebarProps) {
  const { state, setActiveView } = useAppContext();

  const handleNavClick = (view: ActiveView) => {
    setActiveView(view);
    onMobileClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-100 shadow-xl',
          'flex flex-col transition-transform duration-300 ease-in-out',
          'lg:static lg:translate-x-0 lg:shadow-none lg:z-auto',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Main navigation"
        role="navigation"
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-sm">
              <Wallet size={18} className="text-white" aria-hidden="true" />
            </div>
            <div>
              <span className="font-bold text-gray-900 text-base">SpendWise</span>
              <p className="text-xs text-gray-400 leading-none mt-0.5">Expense Tracker</p>
            </div>
          </div>
          {/* Mobile close */}
          <button
            onClick={onMobileClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg lg:hidden transition-colors"
            aria-label="Close navigation"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Navigation items">
          {navItems.map((item) => {
            const isActive = state.activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left',
                  'transition-all duration-150 group',
                  isActive
                    ? 'bg-primary-600 text-white shadow-sm shadow-primary-200'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <span
                  className={clsx(
                    'flex-shrink-0 transition-transform duration-150',
                    'group-hover:scale-110',
                    isActive ? 'text-white' : 'text-gray-400 group-hover:text-primary-600'
                  )}
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <div
                    className={clsx(
                      'font-medium text-sm',
                      isActive ? 'text-white' : 'text-gray-900'
                    )}
                  >
                    {item.label}
                  </div>
                  <div
                    className={clsx(
                      'text-xs truncate',
                      isActive ? 'text-primary-200' : 'text-gray-400'
                    )}
                  >
                    {item.description}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 space-y-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Cloud size={13} className="text-green-400" aria-hidden="true" />
            <span className="truncate">{userEmail}</span>
          </div>
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={15} aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { state } = useAppContext();

  const currentNavItem = navItems.find((n) => n.id === state.activeView);

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 lg:hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={onMenuClick}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Open navigation menu"
          aria-expanded={false}
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
            <Wallet size={14} className="text-white" aria-hidden="true" />
          </div>
          <span className="font-bold text-gray-900">SpendWise</span>
        </div>
        <div className="ml-auto text-sm font-medium text-gray-600">
          {currentNavItem?.label}
        </div>
      </div>
    </header>
  );
}

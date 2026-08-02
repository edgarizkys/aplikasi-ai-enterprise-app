'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  submenu?: NavItem[];
}

const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(
    new Set(['dashboard'])
  );

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Items',
      href: '/items',
      icon: Package,
      submenu: [
        {
          label: 'Daftar Items',
          href: '/items',
          icon: Package,
        },
        {
          label: 'Tambah Item',
          href: '/items/create',
          icon: Package,
        },
      ],
    },
    {
      label: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
    },
    {
      label: 'Pengaturan',
      href: '/settings',
      icon: Settings,
    },
  ];

  const isActive = (href: string): boolean => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const toggleSubmenu = (label: string) => {
    const newExpanded = new Set(expandedMenus);
    if (newExpanded.has(label)) {
      newExpanded.delete(label);
    } else {
      newExpanded.add(label);
    }
    setExpandedMenus(newExpanded);
  };

  const handleLogout = () => {
    // Implement logout logic
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50"
        aria-label="Toggle sidebar"
      >
        {isOpen ? (
          <X className="w-5 h-5 text-gray-700" />
        ) : (
          <Menu className="w-5 h-5 text-gray-700" />
        )}
      </button>

      {/* Sidebar Overlay for Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 z-40 transform transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-600 to-gray-400 flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <span className="font-semibold text-gray-900 text-sm">
              Aplikasi AI
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <div key={item.href}>
              <button
                onClick={() => {
                  if (item.submenu) {
                    toggleSubmenu(item.label);
                  }
                }}
                asChild={!item.submenu}
              >
                {item.submenu ? (
                  <button
                    className={`w-full flex items-center justify-between px-4 py-2 rounded-lg font-medium transition-colors ${
                      expandedMenus.has(item.label)
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        expandedMenus.has(item.label) ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )}
              </button>

              {/* Submenu */}
              {item.submenu && expandedMenus.has(item.label) && (
                <div className="ml-2 mt-1 space-y-1 border-l border-gray-200 pl-3">
                  {item.submenu.map((subitem) => (
                    <Link
                      key={subitem.href}
                      href={subitem.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${
                        isActive(subitem.href)
                          ? 'bg-gray-700 text-white'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <subitem.icon className="w-4 h-4" />
                      <span>{subitem.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 p-3 space-y-2">
          <Link
            href="/settings/profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Pengaturan Profil</span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Spacer for Desktop */}
      <div className="hidden lg:block w-64" />
    </>
  );
};

export default Sidebar;
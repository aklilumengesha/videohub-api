'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
}

const NAV_ITEMS = [
  { href: '/',          icon: '🏠', label: 'Home' },
  { href: '/feed',      icon: '📺', label: 'Feed',     authRequired: true },
  { href: '/trending',  icon: '🔥', label: 'Trending' },
  { href: '/search',    icon: '🔍', label: 'Search' },
];

const LIBRARY_ITEMS = [
  { href: '/history',       icon: '🕐', label: 'History',        authRequired: true },
  { href: '/playlists',     icon: '📋', label: 'Playlists',      authRequired: true },
  { href: '/analytics',     icon: '📊', label: 'Analytics',      authRequired: true },
  { href: '/channel',       icon: '👤', label: 'My Channel',    authRequired: true },
  { href: '/notifications', icon: '🔔', label: 'Notifications', authRequired: true },
  { href: '/upload',        icon: '⬆️', label: 'Upload',        authRequired: true },
];

export default function Sidebar({ isOpen }: SidebarProps) {
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();

  const isActive = (href: string) => pathname === href;

  const renderItem = (item: { href: string; icon: string; label: string; authRequired?: boolean }) => {
    if (item.authRequired && !isLoggedIn) return null;
    return (
      <Link key={item.href} href={item.href}
        className={`flex items-center gap-4 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive(item.href)
            ? 'bg-gray-100 text-gray-900'
            : 'text-gray-700 hover:bg-gray-100'
        }`}>
        <span className="text-lg w-6 text-center">{item.icon}</span>
        {isOpen && <span>{item.label}</span>}
      </Link>
    );
  };

  return (
    <aside className={`fixed left-0 top-14 bottom-0 z-40 transition-all duration-200 overflow-y-auto overflow-x-hidden border-r ${
      isOpen ? 'w-56' : 'w-16'
    }`} style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
      <div className="py-3 px-2 space-y-1">
        {NAV_ITEMS.map(renderItem)}

        {isOpen && (
          <div className="border-t border-gray-200 my-3 pt-3">
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              You
            </p>
          </div>
        )}
        {!isOpen && <div className="border-t border-gray-200 my-3" />}

        {LIBRARY_ITEMS.map(renderItem)}
      </div>
    </aside>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usersApi } from '@/lib/api';
import { useState, useEffect } from 'react';

interface SidebarProps {
  isOpen: boolean;
}

const NAV_ITEMS = [
  { href: '/',         icon: '🏠', label: 'Home' },
  { href: '/feed',     icon: '📺', label: 'Feed',     authRequired: true },
  { href: '/trending', icon: '🔥', label: 'Trending' },
  { href: '/search',   icon: '🔍', label: 'Search' },
];

const LIBRARY_ITEMS = [
  { href: '/history',       icon: '🕐', label: 'History',       authRequired: true },
  { href: '/playlists',     icon: '📋', label: 'Playlists',     authRequired: true },
  { href: '/notifications', icon: '🔔', label: 'Notifications', authRequired: true },
];

const CREATOR_ITEMS = [
  { href: '/upload',    icon: '⬆️', label: 'Upload',          authRequired: true },
  { href: '/studio',    icon: '🎬', label: 'Creator Studio',  authRequired: true },
  { href: '/analytics', icon: '📊', label: 'Analytics',       authRequired: true },
];

export default function Sidebar({ isOpen }: SidebarProps) {
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();
  const [myChannelHref, setMyChannelHref] = useState('/channel');

  useEffect(() => {
    if (!isLoggedIn) return;
    usersApi.getMe()
      .then(u => setMyChannelHref(`/channel/${u.id}`))
      .catch(() => {});
  }, [isLoggedIn]);

  // Active if exact match or starts with href (for nested routes)
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const renderItem = (item: { href: string; icon: string; label: string; authRequired?: boolean }) => {
    if (item.authRequired && !isLoggedIn) return null;
    const active = isActive(item.href);
    return (
      <Link key={item.href} href={item.href}
        className={`flex items-center gap-4 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          active ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'
        }`}>
        <span className="text-lg w-6 text-center flex-shrink-0">{item.icon}</span>
        {isOpen && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  const SectionDivider = ({ label }: { label: string }) => (
    <div className={`my-2 ${isOpen ? 'pt-2 border-t' : 'border-t'}`}
      style={{ borderColor: 'var(--border)' }}>
      {isOpen && (
        <p className="px-3 pt-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
          {label}
        </p>
      )}
    </div>
  );

  return (
    <aside className={`fixed left-0 top-14 bottom-0 z-40 transition-all duration-200 overflow-y-auto overflow-x-hidden border-r ${
      isOpen ? 'w-56' : 'w-16'
    }`} style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
      <div className="py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map(renderItem)}

        {isLoggedIn && (
          <>
            <SectionDivider label="Library" />
            {LIBRARY_ITEMS.map(renderItem)}

            {/* My Channel — dynamic link to own channel */}
            <Link href={myChannelHref}
              className={`flex items-center gap-4 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith('/channel') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'
              }`}>
              <span className="text-lg w-6 text-center flex-shrink-0">📺</span>
              {isOpen && <span className="truncate">My Channel</span>}
            </Link>

            <SectionDivider label="Create" />
            {CREATOR_ITEMS.map(renderItem)}
          </>
        )}

        {!isLoggedIn && (
          <div className="my-2 border-t" style={{ borderColor: 'var(--border)' }} />
        )}
        {!isLoggedIn && NAV_ITEMS.filter(i => !i.authRequired).map(() => null)}
      </div>
    </aside>
  );
}

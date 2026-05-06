'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usersApi } from '@/lib/api';
import { useState, useEffect } from 'react';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface SidebarProps {
  isOpen: boolean;
}

interface Subscription {
  following: { id: string; name: string; avatarUrl?: string };
}

// ── SVG Icons (YouTube-style) ─────────────────────────────────────────────────

const HomeIcon = ({ filled }: { filled: boolean }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.8}>
    {filled
      ? <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      : <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />}
  </svg>
);

const ShortsIcon = ({ filled }: { filled: boolean }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.8}>
    {filled
      ? <path d="M17.77 10.32l-1.2-.5L18 9c1.66-.69 2.45-2.59 1.76-4.24-.69-1.66-2.59-2.45-4.24-1.76L6 6.62C4.34 7.31 3.55 9.21 4.24 10.87c.51 1.23 1.73 1.98 3.01 1.98.41 0 .83-.08 1.23-.24l.23-.1-.23.52C7.97 14.4 8.6 16.27 9.97 17c.53.28 1.1.41 1.66.41.87 0 1.72-.31 2.4-.9l5.37-4.65c.97-.84 1.27-2.2.71-3.37l-2.34.83zm-5.5 4.05l-1.41-1.41 1.41-1.41 1.41 1.41-1.41 1.41z" />
      : <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l-4-2.5v5L15 10zm-3-7a9 9 0 100 18A9 9 0 0012 3z" />}
  </svg>
);

const FeedIcon = ({ filled }: { filled: boolean }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.8}>
    {filled
      ? <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
      : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
  </svg>
);

const TrendingIcon = ({ filled }: { filled: boolean }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.8}>
    {filled
      ? <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
      : <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />}
  </svg>
);

const SearchIcon = ({ filled }: { filled: boolean }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const HistoryIcon = ({ filled }: { filled: boolean }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.8}>
    {filled
      ? <path d="M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0013 21a9 9 0 000-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
      : <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
  </svg>
);

const LikedIcon = ({ filled }: { filled: boolean }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.8}>
    {filled
      ? <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
      : <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />}
  </svg>
);

const PlaylistIcon = ({ filled }: { filled: boolean }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.8}>
    {filled
      ? <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z" />
      : <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />}
  </svg>
);

const BellIcon = ({ filled }: { filled: boolean }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.8}>
    {filled
      ? <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
      : <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />}
  </svg>
);

const ChannelIcon = ({ filled }: { filled: boolean }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.8}>
    {filled
      ? <path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
      : <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />}
  </svg>
);

const UploadIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const StudioIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const AnalyticsIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

// ── Nav config ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: '/',         label: 'Home',     Icon: HomeIcon },
  { href: '/shorts',   label: 'Shorts',   Icon: ShortsIcon },
  { href: '/feed',     label: 'Feed',     Icon: FeedIcon,     authRequired: true },
  { href: '/trending', label: 'Trending', Icon: TrendingIcon },
  { href: '/search',   label: 'Search',   Icon: SearchIcon },
];

const LIBRARY_ITEMS = [
  { href: '/history',       label: 'History',      Icon: HistoryIcon,  authRequired: true },
  { href: '/liked',         label: 'Liked videos', Icon: LikedIcon,    authRequired: true },
  { href: '/playlists',     label: 'Playlists',    Icon: PlaylistIcon, authRequired: true },
  { href: '/notifications', label: 'Notifications',Icon: BellIcon,     authRequired: true },
];

const CREATOR_ITEMS = [
  { href: '/upload',    label: 'Upload',         Icon: UploadIcon,   authRequired: true },
  { href: '/studio',    label: 'Creator Studio', Icon: StudioIcon,   authRequired: true },
  { href: '/analytics', label: 'Analytics',      Icon: AnalyticsIcon,authRequired: true },
];

export default function Sidebar({ isOpen }: SidebarProps) {
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();
  const [myChannelHref, setMyChannelHref] = useState('/channel');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  useEffect(() => {
    if (!isLoggedIn) return;
    usersApi.getMe()
      .then(u => setMyChannelHref(`/channel/${u.id}`))
      .catch(() => {});
    usersApi.getSubscriptions()
      .then((subs: Subscription[]) => setSubscriptions(subs.slice(0, 8)))
      .catch(() => {});
  }, [isLoggedIn]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const renderItem = (item: {
    href: string;
    label: string;
    Icon: React.ComponentType<{ filled: boolean }>;
    authRequired?: boolean;
  }) => {
    if (item.authRequired && !isLoggedIn) return null;
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-label={item.label}
        aria-current={active ? 'page' : undefined}
        className={`flex items-center gap-5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
          active
            ? 'bg-gray-100 text-gray-900 font-semibold'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <span className="flex-shrink-0">
          <item.Icon filled={active} />
        </span>
        {isOpen && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  const Divider = ({ label }: { label?: string }) => (
    <div className="my-1 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
      {isOpen && label && (
        <p className="px-3 pb-1 text-sm font-semibold text-gray-900">{label}</p>
      )}
    </div>
  );

  return (
    <aside
      className={`fixed left-0 top-14 bottom-0 z-40 transition-all duration-200 overflow-y-auto overflow-x-hidden border-r ${
        isOpen ? 'w-56' : 'w-[72px]'
      }`}
      style={{ background: 'var(--background)', borderColor: 'var(--border)' }}
      role="navigation"
      aria-label="Sidebar navigation"
    >
      <div className="py-2 px-2 space-y-0.5">
        {NAV_ITEMS.map(renderItem)}

        {isLoggedIn && (
          <>
            <Divider label="You" />

            {/* My Channel */}
            <Link
              href={myChannelHref}
              className={`flex items-center gap-5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                pathname.startsWith('/channel') ? 'bg-gray-100 text-gray-900 font-semibold' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="flex-shrink-0">
                <ChannelIcon filled={pathname.startsWith('/channel')} />
              </span>
              {isOpen && <span className="truncate">Your channel</span>}
            </Link>

            {LIBRARY_ITEMS.map(renderItem)}

            <Divider label={isOpen ? 'Create' : undefined} />
            {CREATOR_ITEMS.map(renderItem)}

            {/* Subscriptions */}
            {subscriptions.length > 0 && (
              <>
                <Divider label={isOpen ? 'Subscriptions' : undefined} />
                {subscriptions.map(({ following: ch }) => {
                  const active = pathname === `/channel/${ch.id}`;
                  return (
                    <Link
                      key={ch.id}
                      href={`/channel/${ch.id}`}
                      aria-label={ch.name}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center gap-5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                        active ? 'bg-gray-100 text-gray-900 font-semibold' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="w-6 h-6 flex-shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                        {ch.avatarUrl ? (
                          <Image
                            src={`${API_URL}/${ch.avatarUrl}`}
                            alt={ch.name}
                            width={24}
                            height={24}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        ) : (
                          ch.name.charAt(0).toUpperCase()
                        )}
                      </span>
                      {isOpen && <span className="truncate">{ch.name}</span>}
                    </Link>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

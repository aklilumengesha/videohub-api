'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usersApi } from '@/lib/api';
import { useState, useEffect } from 'react';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface SidebarProps { isOpen: boolean; }
interface Subscription { following: { id: string; name: string; avatarUrl?: string }; }

// ── Icons ─────────────────────────────────────────────────────────────────────
const Icon = {
  Home: (f: boolean) => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill={f ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={f ? 0 : 1.8}>
      {f ? <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/> : <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>}
    </svg>
  ),
  Shorts: (f: boolean) => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill={f ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={f ? 0 : 1.8}>
      {f ? <path d="M17.77 10.32l-1.2-.5L18 9c1.66-.69 2.45-2.59 1.76-4.24-.69-1.66-2.59-2.45-4.24-1.76L6 6.62C4.34 7.31 3.55 9.21 4.24 10.87c.51 1.23 1.73 1.98 3.01 1.98.41 0 .83-.08 1.23-.24l.23-.1-.23.52C7.97 14.4 8.6 16.27 9.97 17c.53.28 1.1.41 1.66.41.87 0 1.72-.31 2.4-.9l5.37-4.65c.97-.84 1.27-2.2.71-3.37l-2.34.83z"/> : <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l-4-2.5v5L15 10zm-3-7a9 9 0 100 18A9 9 0 0012 3z"/>}
    </svg>
  ),
  Subscriptions: (f: boolean) => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill={f ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={f ? 0 : 1.8}>
      {f ? <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z"/> : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7"/>}
    </svg>
  ),
  Channel: (f: boolean) => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill={f ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={f ? 0 : 1.8}>
      {f ? <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/> : <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>}
    </svg>
  ),
  History: (f: boolean) => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill={f ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={f ? 0 : 1.8}>
      {f ? <path d="M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0013 21a9 9 0 000-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/> : <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>}
    </svg>
  ),
  Playlist: (f: boolean) => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill={f ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={f ? 0 : 1.8}>
      {f ? <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z"/> : <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>}
    </svg>
  ),
  WatchLater: (f: boolean) => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill={f ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={f ? 0 : 1.8}>
      {f ? <path d="M23 12c0-6.07-4.93-11-11-11S1 5.93 1 12s4.93 11 11 11 11-4.93 11-11zm-11 7V5c3.87 0 7 3.13 7 7s-3.13 7-7 7z"/> : <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>}
    </svg>
  ),
  Liked: (f: boolean) => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill={f ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={f ? 0 : 1.8}>
      {f ? <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/> : <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/>}
    </svg>
  ),
};

export default function Sidebar({ isOpen }: SidebarProps) {
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();
  const [myChannelHref, setMyChannelHref] = useState('/channel');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [showAllSubs, setShowAllSubs] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    usersApi.getMe().then(u => setMyChannelHref(`/channel/${u.id}`)).catch(() => {});
    usersApi.getSubscriptions().then((s: Subscription[]) => setSubscriptions(s)).catch(() => {});
  }, [isLoggedIn]);

  const active = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  const Item = ({
    href, label, iconFn, end,
  }: {
    href: string;
    label: string;
    iconFn: (f: boolean) => React.ReactNode;
    end?: boolean;
  }) => {
    const on = end ? pathname === href : active(href);
    return (
      <Link href={href}
        aria-current={on ? 'page' : undefined}
        className={`flex items-center gap-5 px-3 py-2 rounded-xl text-sm transition-colors ${
          on ? 'bg-gray-100 font-semibold text-gray-900' : 'text-gray-700 hover:bg-gray-100'
        }`}>
        <span className="flex-shrink-0 w-6">{iconFn(on)}</span>
        {isOpen && <span className="truncate">{label}</span>}
      </Link>
    );
  };

  const Divider = ({ label }: { label?: string }) => (
    <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
      {isOpen && label && (
        <p className="px-3 py-1 text-sm font-semibold text-gray-900">{label}</p>
      )}
    </div>
  );

  const visibleSubs = showAllSubs ? subscriptions : subscriptions.slice(0, 7);

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

        {/* ── Main nav ── */}
        <Item href="/" label="Home" iconFn={Icon.Home} end />
        <Item href="/shorts" label="Shorts" iconFn={Icon.Shorts} />
        <Item href="/feed" label="Subscriptions" iconFn={Icon.Subscriptions} />

        {/* ── You section ── */}
        {isLoggedIn && (
          <>
            <Divider label="You" />
            <Link href={myChannelHref}
              className={`flex items-center gap-5 px-3 py-2 rounded-xl text-sm transition-colors ${
                pathname.startsWith('/channel') ? 'bg-gray-100 font-semibold text-gray-900' : 'text-gray-700 hover:bg-gray-100'
              }`}>
              <span className="flex-shrink-0 w-6">{Icon.Channel(pathname.startsWith('/channel'))}</span>
              {isOpen && <span className="truncate">Your channel</span>}
            </Link>
            <Item href="/history"   label="History"     iconFn={Icon.History} />
            <Item href="/playlists" label="Playlists"   iconFn={Icon.Playlist} />
            <Item href="/liked"     label="Liked videos" iconFn={Icon.Liked} />
          </>
        )}

        {/* ── Subscriptions section ── */}
        {isLoggedIn && subscriptions.length > 0 && (
          <>
            <Divider label="Subscriptions" />
            {visibleSubs.map(({ following: ch }) => {
              const on = pathname === `/channel/${ch.id}`;
              return (
                <Link key={ch.id} href={`/channel/${ch.id}`}
                  aria-current={on ? 'page' : undefined}
                  className={`flex items-center gap-5 px-3 py-2 rounded-xl text-sm transition-colors ${
                    on ? 'bg-gray-100 font-semibold text-gray-900' : 'text-gray-700 hover:bg-gray-100'
                  }`}>
                  <span className="w-6 h-6 flex-shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                    {ch.avatarUrl ? (
                      <Image src={`${API_URL}/${ch.avatarUrl}`} alt={ch.name} width={24} height={24} className="w-full h-full object-cover" unoptimized />
                    ) : ch.name.charAt(0).toUpperCase()}
                  </span>
                  {isOpen && <span className="truncate">{ch.name}</span>}
                </Link>
              );
            })}
            {isOpen && subscriptions.length > 7 && (
              <button onClick={() => setShowAllSubs(v => !v)}
                className="flex items-center gap-5 px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-gray-100 w-full transition-colors">
                <span className="w-6 flex items-center justify-center">
                  <svg className={`w-5 h-5 transition-transform ${showAllSubs ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
                <span>{showAllSubs ? 'Show less' : `Show ${subscriptions.length - 7} more`}</span>
              </button>
            )}
          </>
        )}

      </div>
    </aside>
  );
}

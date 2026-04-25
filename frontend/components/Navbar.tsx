'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { notificationsApi, usersApi } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface NavbarProps {
  onMenuToggle?: () => void;
}

export default function Navbar({ onMenuToggle }: NavbarProps) {
  const router = useRouter();
  const { isLoggedIn, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (!isLoggedIn) { setUnreadCount(0); setAvatarUrl(null); setUserName(''); return; }

    // Fetch initial unread count + user profile
    notificationsApi.getUnreadCount()
      .then(data => setUnreadCount(data.count ?? 0))
      .catch(() => {});
    usersApi.getMe()
      .then(u => { setAvatarUrl(u.avatarUrl ?? null); setUserName(u.name); })
      .catch(() => {});

    // Open SSE stream for real-time notifications
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const es = new EventSource(`${API_BASE}/sse/events?token=${encodeURIComponent(token)}`);

    es.addEventListener('notification', () => {
      // Any new notification — increment badge
      setUnreadCount(c => c + 1);
    });

    es.onerror = () => {
      // SSE disconnected — fall back to polling
      es.close();
      const interval = setInterval(() => {
        notificationsApi.getUnreadCount()
          .then(data => setUnreadCount(data.count ?? 0))
          .catch(() => {});
      }, 30000);
      return () => clearInterval(interval);
    };

    return () => { es.close(); };
  }, [isLoggedIn]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUnreadCount(0);
    setAvatarUrl(null);
    setUserName('');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 h-14 flex items-center px-4 gap-4">
      {/* Left — hamburger + logo */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <button onClick={onMenuToggle} className="p-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Menu">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link href="/" className="flex items-center gap-1">
          <span className="text-xl">🎬</span>
          <span className="font-bold text-gray-900 text-lg hidden sm:block">VideoHub</span>
        </Link>
      </div>

      {/* Center — search bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-auto flex">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search"
          className="flex-1 border border-gray-300 rounded-l-full px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
        <button type="submit"
          className="px-5 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-full hover:bg-gray-200 transition-colors">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </form>

      {/* Right — actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isLoggedIn ? (
          <>
            {/* Upload */}
            <Link href="/upload" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-gray-100 text-sm font-medium transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:block">Upload</span>
            </Link>

            {/* Notifications */}
            <Link href="/notifications" className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>

            {/* Avatar / logout */}
            <button onClick={handleLogout}
              className="w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-colors flex-shrink-0"
              title="Logout">
              {avatarUrl ? (
                <Image
                  src={`${API_URL}/${avatarUrl}`}
                  alt={userName}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">
                  {userName ? userName.charAt(0).toUpperCase() : 'V'}
                </div>
              )}
            </button>
          </>
        ) : (
          <Link href="/auth/login"
            className="flex items-center gap-1.5 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-full text-sm font-medium hover:bg-blue-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { notificationsApi } from '@/lib/api';

export default function Navbar() {
  const pathname = usePathname();
  const { isLoggedIn, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll unread count every 30 seconds when logged in
  useEffect(() => {
    if (!isLoggedIn) { setUnreadCount(0); return; }

    const fetch = () => {
      notificationsApi.getUnreadCount()
        .then(data => setUnreadCount(data.count ?? 0))
        .catch(() => {});
    };

    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const handleLogout = async () => {
    await logout();
    setUnreadCount(0);
  };

  const isActive = (path: string) =>
    pathname === path ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-gray-900';

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
      <div className="max-w-5xl mx-auto flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="text-xl font-bold text-blue-600">
          VideoHub
        </Link>

        {/* Center nav links */}
        <div className="hidden sm:flex items-center gap-6">
          <Link href="/" className={`text-sm ${isActive('/')}`}>Home</Link>
          {isLoggedIn && (
            <Link href="/feed" className={`text-sm ${isActive('/feed')}`}>Feed</Link>
          )}
          <Link href="/search" className={`text-sm ${isActive('/search')}`}>Search</Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              {/* Notifications bell */}
              <Link
                href="/notifications"
                className="relative p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                title="Notifications"
              >
                <span className="text-lg">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* Upload */}
              <Link
                href="/upload"
                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Upload
              </Link>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900">
                Sign in
              </Link>
              <Link
                href="/auth/register"
                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Get started
              </Link>
            </>
          )}
        </div>

      </div>
    </nav>
  );
}

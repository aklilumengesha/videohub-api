'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { notificationsApi, usersApi } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface NavbarProps {
  onMenuToggle?: () => void;
}

export default function Navbar({ onMenuToggle }: NavbarProps) {
  const router = useRouter();
  const { isLoggedIn, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const suggestionsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      setUnreadCount(0); setAvatarUrl(null); setUserName(''); setUserEmail(''); setUserId('');
      return;
    }

    notificationsApi.getUnreadCount()
      .then(data => setUnreadCount(data.count ?? 0))
      .catch(() => {});
    usersApi.getMe()
      .then(u => {
        setAvatarUrl(u.avatarUrl ?? null);
        setUserName(u.name);
        setUserEmail(u.email ?? '');
        setUserId(u.id ?? '');
      })
      .catch(() => {});

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const es = new EventSource(`${API_BASE}/sse/events?token=${encodeURIComponent(token)}`);

    es.addEventListener('notification', () => {
      setUnreadCount(c => c + 1);
    });

    es.onerror = () => {
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

  // Load search history from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const history = localStorage.getItem('searchHistory');
      if (history) {
        try {
          setSearchHistory(JSON.parse(history));
        } catch { /* ignore */ }
      }
    }
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Generate search suggestions (debounced)
  useEffect(() => {
    if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current);
    
    if (searchQuery.trim().length < 2) {
      setSearchSuggestions([]);
      return;
    }

    suggestionsTimerRef.current = setTimeout(() => {
      // Simple suggestion logic - in production, call backend API
      const query = searchQuery.toLowerCase();
      const suggestions: string[] = [];
      
      // Add matching history items
      searchHistory.forEach(item => {
        if (item.toLowerCase().includes(query) && !suggestions.includes(item)) {
          suggestions.push(item);
        }
      });
      
      // Add common suggestions
      const commonSuggestions = [
        'tutorial', 'gaming', 'music', 'vlog', 'review', 'how to',
        'react', 'javascript', 'python', 'cooking', 'travel'
      ];
      
      commonSuggestions.forEach(item => {
        if (item.includes(query) && !suggestions.includes(item) && suggestions.length < 8) {
          suggestions.push(item);
        }
      });
      
      setSearchSuggestions(suggestions.slice(0, 8));
    }, 300);

    return () => {
      if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current);
    };
  }, [searchQuery, searchHistory]);

  const handleSearch = (e: React.FormEvent, query?: string) => {
    e.preventDefault();
    const searchTerm = query || searchQuery.trim();
    if (searchTerm) {
      // Save to history
      const newHistory = [searchTerm, ...searchHistory.filter(h => h !== searchTerm)].slice(0, 10);
      setSearchHistory(newHistory);
      if (typeof window !== 'undefined') {
        localStorage.setItem('searchHistory', JSON.stringify(newHistory));
      }
      
      router.push(`/search?q=${encodeURIComponent(searchTerm)}`);
      setShowSuggestions(false);
      setSearchQuery('');
    }
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('searchHistory');
    }
  };

  const handleVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice search is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      setIsListening(false);
      // Auto-search after voice input
      setTimeout(() => {
        const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
        handleSearch(fakeEvent, transcript);
      }, 500);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    setUnreadCount(0);
    setAvatarUrl(null);
    setUserName('');
    setUserEmail('');
    setUserId('');
  };

  const Avatar = () => (
    <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-colors flex-shrink-0">
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
    </div>
  );

  const ThemeToggle = () => (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-full hover:bg-gray-100 transition-colors"
      aria-label="Toggle theme"
    >
      {resolvedTheme === 'dark' ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 gap-4 border-b transition-colors"
      style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>

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

      {/* Center — search bar with suggestions */}
      <div className="flex-1 max-w-xl mx-auto relative" ref={searchRef}>
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="flex-1 flex">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search"
              className="flex-1 border border-gray-300 rounded-l-full px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
            <button type="submit"
              className="px-5 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-full hover:bg-gray-200 transition-colors">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
          
          {/* Voice search button */}
          <button
            type="button"
            onClick={handleVoiceSearch}
            disabled={isListening}
            className={`p-2 rounded-full transition-colors ${
              isListening 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
            title="Voice search"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
        </form>

        {/* Search suggestions dropdown */}
        {showSuggestions && (searchSuggestions.length > 0 || searchHistory.length > 0) && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-xl border overflow-hidden z-50"
            style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
            
            {/* Search history */}
            {searchHistory.length > 0 && searchQuery.trim().length === 0 && (
              <div>
                <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recent searches</p>
                  <button onClick={clearSearchHistory} className="text-xs text-blue-600 hover:text-blue-700">
                    Clear all
                  </button>
                </div>
                {searchHistory.slice(0, 5).map((item, i) => (
                  <button
                    key={i}
                    onClick={(e) => handleSearch(e, item)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {item}
                  </button>
                ))}
              </div>
            )}

            {/* Suggestions */}
            {searchSuggestions.length > 0 && searchQuery.trim().length > 0 && (
              <div>
                {searchHistory.length > 0 && searchQuery.trim().length === 0 && (
                  <div className="border-t" style={{ borderColor: 'var(--border)' }} />
                )}
                {searchSuggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={(e) => handleSearch(e, suggestion)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>
                      {suggestion.substring(0, suggestion.toLowerCase().indexOf(searchQuery.toLowerCase()))}
                      <strong>{suggestion.substring(
                        suggestion.toLowerCase().indexOf(searchQuery.toLowerCase()),
                        suggestion.toLowerCase().indexOf(searchQuery.toLowerCase()) + searchQuery.length
                      )}</strong>
                      {suggestion.substring(suggestion.toLowerCase().indexOf(searchQuery.toLowerCase()) + searchQuery.length)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isLoggedIn ? (
          <>
            <ThemeToggle />

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

            {/* Account menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="focus:outline-none"
                aria-label="Account menu"
              >
                <Avatar />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-11 w-64 rounded-xl shadow-xl border z-50 overflow-hidden"
                  style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>

                  {/* User info header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                    <Avatar />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
                      <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    <Link href={`/profile/${userId}`} onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                      <span className="text-base">👤</span> Your profile
                    </Link>
                    <Link href="/channel" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                      <span className="text-base">📺</span> My Channel
                    </Link>
                    <Link href="/analytics" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                      <span className="text-base">📊</span> Analytics
                    </Link>
                    <Link href="/playlists" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                      <span className="text-base">📋</span> Playlists
                    </Link>
                  </div>

                  <div className="border-t py-1" style={{ borderColor: 'var(--border)' }}>
                    {/* Theme toggle in menu */}
                    <button
                      onClick={() => { setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'); setMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
                    >
                      <span className="text-base">{resolvedTheme === 'dark' ? '☀️' : '🌙'}</span>
                      {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
                    </button>
                    <Link href="/admin" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                      <span className="text-base">🛡️</span> Admin panel
                    </Link>
                  </div>

                  <div className="border-t py-1" style={{ borderColor: 'var(--border)' }}>
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left">
                      <span className="text-base">🚪</span> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <ThemeToggle />
            <Link href="/auth/login"
              className="flex items-center gap-1.5 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-full text-sm font-medium hover:bg-blue-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Sign in
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

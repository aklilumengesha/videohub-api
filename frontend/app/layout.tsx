'use client';

import { Geist } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import ShortcutsModal from '@/components/ShortcutsModal';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useState, useEffect, useRef } from 'react';

const geist = Geist({ subsets: ['latin'] });

function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useKeyboardShortcuts({
    onSearch: () => {
      const input = document.querySelector<HTMLInputElement>('header input[type="text"]');
      input?.focus();
    },
    onHelp: () => setShowShortcuts(v => !v),
  });

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <>
      <Navbar
        onMenuToggle={() => setSidebarOpen(s => !s)}
      />
      <div className="flex pt-14">
        {/* Sidebar — hidden on mobile */}
        <div className="hidden md:block">
          <Sidebar isOpen={sidebarOpen} />
        </div>
        <main
          className={`flex-1 min-h-screen transition-all duration-200 pb-16 md:pb-0 ${
            sidebarOpen ? 'md:ml-56' : 'md:ml-16'
          }`}
          style={{ background: 'var(--surface)' }}
        >
          {children}
        </main>
      </div>
      {/* Mobile bottom navigation */}
      <MobileNav />
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="VideoHub" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={geist.className}>
        <ThemeProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

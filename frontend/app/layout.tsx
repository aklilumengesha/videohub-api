'use client';

import { Geist } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import ShortcutsModal from '@/components/ShortcutsModal';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useState, useRef } from 'react';

const geist = Geist({ subsets: ['latin'] });

function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useKeyboardShortcuts({
    onSearch: () => {
      // Focus the search input in the Navbar
      const input = document.querySelector<HTMLInputElement>('header input[type="text"]');
      input?.focus();
    },
    onHelp: () => setShowShortcuts(v => !v),
  });

  return (
    <>
      <Navbar
        onMenuToggle={() => setSidebarOpen(s => !s)}
        searchRef={searchRef}
      />
      <div className="flex pt-14">
        <Sidebar isOpen={sidebarOpen} />
        <main
          className={`flex-1 min-h-screen transition-all duration-200 ${sidebarOpen ? 'ml-56' : 'ml-16'}`}
          style={{ background: 'var(--surface)' }}
        >
          {children}
        </main>
      </div>
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
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

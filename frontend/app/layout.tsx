'use client';

import { Geist } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { useState } from 'react';

const geist = Geist({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <html lang="en">
      <body className={`${geist.className} bg-white`}>
        <AuthProvider>
          <Navbar onMenuToggle={() => setSidebarOpen(s => !s)} />
          <div className="flex pt-14">
            <Sidebar isOpen={sidebarOpen} />
            <main className={`flex-1 min-h-screen bg-gray-50 transition-all duration-200 ${sidebarOpen ? 'ml-56' : 'ml-16'}`}>
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}

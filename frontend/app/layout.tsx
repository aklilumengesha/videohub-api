import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VideoHub',
  description: 'A video sharing platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} min-h-screen bg-gray-50`}>
        {/* AuthProvider makes useAuth() available to every page */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

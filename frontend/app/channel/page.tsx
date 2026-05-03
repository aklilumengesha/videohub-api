'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usersApi } from '@/lib/api';

// Redirect /channel → /channel/:userId (the user's own channel)
export default function ChannelRedirectPage() {
  const router = useRouter();
  const { isLoggedIn, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isLoggedIn) { router.push('/auth/login'); return; }
    if (!isLoggedIn) return;
    usersApi.getMe()
      .then((u: { id: string }) => router.replace(`/channel/${u.id}`))
      .catch(() => router.push('/'));
  }, [isLoggedIn, authLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

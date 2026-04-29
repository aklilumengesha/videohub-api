'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usersApi } from '@/lib/api';

interface SubscribeButtonProps {
  userId: string;
  initialSubscribed?: boolean;
  onSubscribeChange?: (subscribed: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
}

export default function SubscribeButton({ 
  userId, 
  initialSubscribed = false,
  onSubscribeChange,
  size = 'md'
}: SubscribeButtonProps) {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(initialSubscribed);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      usersApi.isFollowing(userId)
        .then(res => setIsSubscribed(res.following))
        .catch(() => {});
    }
  }, [userId, isLoggedIn]);

  const handleClick = async () => {
    if (!isLoggedIn) {
      router.push('/auth/login');
      return;
    }

    setLoading(true);
    try {
      if (isSubscribed) {
        await usersApi.unfollow(userId);
        setIsSubscribed(false);
        onSubscribeChange?.(false);
      } else {
        await usersApi.follow(userId);
        setIsSubscribed(true);
        onSubscribeChange?.(true);
      }
    } catch {
      // Revert on error
      setIsSubscribed(!isSubscribed);
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-sm',
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`${sizeClasses[size]} rounded-full font-medium transition-colors disabled:opacity-50 ${
        isSubscribed
          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          : 'bg-red-600 text-white hover:bg-red-700'
      }`}
    >
      {loading ? 'Loading...' : isSubscribed ? 'Subscribed' : 'Subscribe'}
    </button>
  );
}

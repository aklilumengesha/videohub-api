'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { notificationsApi, type Notification } from '@/lib/api';

const TYPE_LABELS: Record<string, { icon: string; text: (actor: string) => string }> = {
  NEW_FOLLOWER:    { icon: '👤', text: (a) => `${a} started following you` },
  VIDEO_LIKED:     { icon: '❤️', text: (a) => `${a} liked your video` },
  VIDEO_COMMENTED: { icon: '💬', text: (a) => `${a} commented on your video` },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { isLoggedIn, loading: authLoading } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push('/auth/login');
    }
  }, [isLoggedIn, authLoading, router]);

  useEffect(() => {
    if (!isLoggedIn) return;
    notificationsApi.getAll()
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    setMarking(true);
    try {
      await notificationsApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {
      // ignore
    } finally {
      setMarking(false);
    }
  };

  if (authLoading || (!isLoggedIn && !authLoading)) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={marking}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
            >
              {marking ? 'Marking...' : 'Mark all read'}
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse flex gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🔔</div>
            <h2 className="text-lg font-semibold text-gray-700 mb-1">No notifications yet</h2>
            <p className="text-gray-400 text-sm">When someone follows you or likes your videos, you&apos;ll see it here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => {
              const meta = TYPE_LABELS[n.type] ?? { icon: '🔔', text: (a: string) => `${a} interacted with you` };
              const href = n.videoId ? `/videos/${n.videoId}` : `/profile/${n.actor.id}`;

              return (
                <Link
                  key={n.id}
                  href={href}
                  className={`flex items-start gap-3 p-4 rounded-xl border transition-colors hover:shadow-sm ${
                    n.read
                      ? 'bg-white border-gray-100'
                      : 'bg-blue-50 border-blue-100'
                  }`}
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">
                    {meta.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">
                      <span className="font-semibold">{n.actor.name}</span>
                      {' '}
                      {meta.text('').replace(n.actor.name, '').trim()}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5" />
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

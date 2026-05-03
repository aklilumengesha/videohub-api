'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { notificationsApi, type Notification } from '@/lib/api';

const TYPE_META: Record<string, { icon: string; verb: string; color: string }> = {
  NEW_FOLLOWER:    { icon: '👤', verb: 'subscribed to your channel', color: 'bg-purple-100 text-purple-700' },
  VIDEO_LIKED:     { icon: '👍', verb: 'liked your video',           color: 'bg-blue-100 text-blue-700' },
  VIDEO_COMMENTED: { icon: '💬', verb: 'commented on your video',    color: 'bg-green-100 text-green-700' },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupByDate(notifications: Notification[]): { label: string; items: Notification[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const weekAgo = today - 7 * 86400000;

  const groups: Record<string, Notification[]> = {};

  for (const n of notifications) {
    const t = new Date(n.createdAt).getTime();
    let label: string;
    if (t >= today) label = 'Today';
    else if (t >= yesterday) label = 'Yesterday';
    else if (t >= weekAgo) label = 'This week';
    else label = 'Older';

    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }

  const order = ['Today', 'Yesterday', 'This week', 'Older'];
  return order.filter(l => groups[l]).map(l => ({ label: l, items: groups[l] }));
}

export default function NotificationsPage() {
  const router = useRouter();
  const { isLoggedIn, loading: authLoading } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.push('/auth/login');
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
    } catch { /* ignore */ }
    finally { setMarking(false); }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch { /* ignore */ }
  };

  if (authLoading || (!isLoggedIn && !authLoading)) return null;

  const groups = groupByDate(notifications);

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} disabled={marking}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 transition-colors">
              {marking ? 'Marking...' : 'Mark all as read'}
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-4 rounded-xl animate-pulse" style={{ background: 'var(--background)' }}>
                <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">🔔</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No notifications yet</h2>
            <p className="text-gray-400 text-sm">When someone subscribes or likes your videos, you&apos;ll see it here</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(group => (
              <div key={group.label}>
                {/* Date group label */}
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.items.map(n => {
                    const meta = TYPE_META[n.type] ?? { icon: '🔔', verb: 'interacted with you', color: 'bg-gray-100 text-gray-700' };
                    const href = n.videoId ? `/videos/${n.videoId}` : `/profile/${n.actor.id}`;

                    return (
                      <Link key={n.id} href={href}
                        onClick={() => { if (!n.read) handleMarkRead(n.id); }}
                        className={`flex items-start gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-gray-100 ${
                          !n.read ? 'bg-blue-50' : ''
                        }`}
                        style={n.read ? { background: 'var(--background)' } : {}}>

                        {/* Actor avatar with type icon badge */}
                        <div className="relative flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                            {n.actor.name.charAt(0).toUpperCase()}
                          </div>
                          <span className={`absolute -bottom-1 -right-1 text-xs w-5 h-5 rounded-full flex items-center justify-center ${meta.color}`}>
                            {meta.icon}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 leading-snug">
                            <Link href={`/profile/${n.actor.id}`}
                              className="font-semibold hover:text-blue-600"
                              onClick={e => e.stopPropagation()}>
                              {n.actor.name}
                            </Link>
                            {' '}{meta.verb}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                        </div>

                        {/* Unread dot */}
                        {!n.read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

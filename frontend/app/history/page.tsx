'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { usersApi } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface HistoryItem {
  watchedAt: string;
  video: {
    id: string;
    title: string;
    thumbnailUrl?: string;
    duration?: number;
    viewCount: number;
    createdAt: string;
    user: { id: string; name: string };
  };
}

function formatDuration(s?: number) {
  if (!s) return '';
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function HistoryPage() {
  const router = useRouter();
  const { isLoggedIn, loading: authLoading } = useAuth();

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.push('/auth/login');
  }, [isLoggedIn, authLoading, router]);

  useEffect(() => {
    if (!isLoggedIn) return;
    usersApi.getHistory()
      .then((data: { items: HistoryItem[]; nextCursor: string | null }) => {
        setItems(data.items);
        setNextCursor(data.nextCursor);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const data: { items: HistoryItem[]; nextCursor: string | null } = await usersApi.getHistory(nextCursor);
      setItems(prev => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
    } catch { /* ignore */ }
    finally { setLoadingMore(false); }
  };

  const handleClear = async () => {
    if (!confirm('Clear all watch history?')) return;
    setClearing(true);
    try {
      await usersApi.clearHistory();
      setItems([]);
      setNextCursor(null);
    } catch { /* ignore */ }
    finally { setClearing(false); }
  };

  if (authLoading || (!isLoggedIn && !authLoading)) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Watch History</h1>
          {items.length > 0 && (
            <button
              onClick={handleClear}
              disabled={clearing}
              className="text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
            >
              {clearing ? 'Clearing...' : 'Clear all'}
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">📺</div>
            <p className="text-lg font-medium text-gray-600 mb-1">No watch history yet</p>
            <p className="text-sm mb-4">Videos you watch will appear here</p>
            <Link href="/" className="text-blue-600 hover:underline text-sm">Browse videos</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <Link
                key={item.video.id}
                href={`/videos/${item.video.id}`}
                className="flex gap-4 bg-white rounded-xl p-3 hover:shadow-md transition-shadow border border-gray-100"
              >
                {/* Thumbnail */}
                <div className="relative w-36 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-900">
                  {item.video.thumbnailUrl ? (
                    <Image
                      src={`${API_URL}/${item.video.thumbnailUrl}`}
                      alt={item.video.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center">
                      <span className="text-2xl opacity-60">🎥</span>
                    </div>
                  )}
                  {item.video.duration && (
                    <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                      {formatDuration(item.video.duration)}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{item.video.title}</h3>
                  <p className="text-sm text-blue-600 mt-0.5">{item.video.user.name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>👁 {item.video.viewCount.toLocaleString()}</span>
                    <span>Watched {timeAgo(item.watchedAt)}</span>
                  </div>
                </div>
              </Link>
            ))}

            {nextCursor && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full py-3 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

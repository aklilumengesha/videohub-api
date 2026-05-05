'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { likedVideosApi } from '@/lib/api';
import VideoThumbnail from '@/components/VideoThumbnail';

interface LikedItem {
  likedAt: string;
  video: {
    id: string;
    title: string;
    thumbnailUrl?: string;
    filePath?: string;
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

function formatViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K views`;
  return `${n} view${n !== 1 ? 's' : ''}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'today';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function LikedVideosPage() {
  const router = useRouter();
  const { isLoggedIn, loading: authLoading } = useAuth();

  const [items, setItems] = useState<LikedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.push('/auth/login');
  }, [isLoggedIn, authLoading, router]);

  useEffect(() => {
    if (!isLoggedIn) return;
    likedVideosApi.getAll()
      .then((data: { items: LikedItem[]; nextCursor: string | null }) => {
        setItems(data.items ?? data);
        setNextCursor(data.nextCursor ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const data: { items: LikedItem[]; nextCursor: string | null } = await likedVideosApi.getAll(nextCursor);
      setItems(prev => [...prev, ...(data.items ?? data)]);
      setNextCursor(data.nextCursor ?? null);
    } catch { /* ignore */ }
    finally { setLoadingMore(false); }
  };

  if (authLoading || (!isLoggedIn && !authLoading)) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">👍</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Liked videos</h1>
            {!loading && (
              <p className="text-sm text-gray-500">{items.length} video{items.length !== 1 ? 's' : ''}</p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="w-40 h-24 rounded-xl bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">👍</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No liked videos yet</h2>
            <p className="text-gray-500 mb-6">Videos you like will appear here</p>
            <Link href="/" className="bg-blue-600 text-white px-6 py-2.5 rounded-full font-medium hover:bg-blue-700 transition-colors">
              Browse videos
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(item => (
              <Link key={item.video.id} href={`/videos/${item.video.id}`}
                className="flex gap-4 group rounded-xl p-1 hover:bg-gray-100 transition-colors">
                {/* Thumbnail */}
                <div className="relative w-40 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-900">
                  <VideoThumbnail
                    thumbnailUrl={item.video.thumbnailUrl}
                    filePath={item.video.filePath}
                    title={item.video.title}
                    className="object-cover"
                  />
                  {item.video.duration && (
                    <span className="absolute bottom-1 right-1 bg-black/90 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                      {formatDuration(item.video.duration)}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 py-0.5">
                  <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm leading-snug mb-1">
                    {item.video.title}
                  </h3>
                  <Link href={`/channel/${item.video.user.id}`}
                    onClick={e => e.stopPropagation()}
                    className="text-xs text-gray-500 hover:text-blue-600 transition-colors">
                    {item.video.user.name}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {item.video.viewCount > 0 ? `${formatViews(item.video.viewCount)} · ` : ''}
                    Liked {timeAgo(item.likedAt)}
                  </p>
                </div>
              </Link>
            ))}

            {nextCursor && (
              <button onClick={loadMore} disabled={loadingMore}
                className="w-full py-3 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50">
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

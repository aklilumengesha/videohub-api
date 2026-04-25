'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { feedApi, type Video } from '@/lib/api';
import VideoCard from '@/components/VideoCard';

export default function FeedPage() {
  const router = useRouter();
  const { isLoggedIn, loading: authLoading } = useAuth();

  const [videos, setVideos] = useState<Video[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push('/auth/login');
    }
  }, [isLoggedIn, authLoading, router]);

  const loadFeed = useCallback(async (nextCursor?: string) => {
    try {
      const data: Video[] = await feedApi.getPersonalized(nextCursor);
      if (nextCursor) {
        setVideos(prev => [...prev, ...data]);
      } else {
        setVideos(data);
      }
      if (data.length < 20) setHasMore(false);
      if (data.length > 0) setCursor(data[data.length - 1].createdAt);
    } catch {
      setHasMore(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      loadFeed().finally(() => setLoading(false));
    }
  }, [isLoggedIn, loadFeed]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await loadFeed(cursor);
    setLoadingMore(false);
  };

  if (authLoading || (!isLoggedIn && !authLoading)) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Your Feed</h1>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            Explore all →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="h-40 bg-gray-200 rounded-lg mb-3" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">👥</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Your feed is empty</h2>
            <p className="text-gray-500 mb-6">Follow creators to see their videos here</p>
            <Link
              href="/"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700"
            >
              Discover creators
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map(video => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

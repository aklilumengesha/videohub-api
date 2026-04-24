'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { feedApi, type Video } from '@/lib/api';

function VideoCard({ video }: { video: Video }) {
  return (
    <Link
      href={`/videos/${video.id}`}
      className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col"
    >
      <div className="h-40 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
        <span className="text-4xl">🎥</span>
      </div>
      <div className="p-4 flex-1">
        <h3 className="font-semibold text-gray-900 truncate mb-1">{video.title}</h3>
        {video.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-2">{video.description}</p>
        )}
        <div className="flex items-center justify-between text-xs text-gray-400 mt-auto">
          <Link
            href={`/profile/${video.user.id}`}
            onClick={e => e.stopPropagation()}
            className="hover:text-blue-600 font-medium"
          >
            {video.user.name}
          </Link>
          <div className="flex items-center gap-2">
            <span>❤️ {video.likeCount}</span>
            <span>💬 {video.commentCount}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

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
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-blue-600">VideoHub</Link>
          <div className="flex items-center gap-4">
            <Link href="/feed" className="text-sm font-medium text-blue-600">Feed</Link>
            <Link href="/search" className="text-sm text-gray-600 hover:text-gray-900">Search</Link>
            <Link href="/upload" className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700">
              Upload
            </Link>
          </div>
        </div>
      </nav>

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

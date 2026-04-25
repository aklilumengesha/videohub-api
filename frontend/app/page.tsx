'use client';

// Home page — fetches all videos from GET /videos (public endpoint, no auth needed)
// Shows navbar with login/logout based on auth state
// Demonstrates: useEffect for data fetching, conditional rendering based on auth

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { videosApi } from '@/lib/api';
import VideoCard from '@/components/VideoCard';
import type { Video } from '@/lib/api';

export default function HomePage() {
  const { isLoggedIn, logout, loading } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  // Fetch videos on mount — GET /videos is public, no token needed
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const data = await videosApi.getAll();
        setVideos(data);
      } catch {
        setError('Failed to load videos');
      } finally {
        setFetching(false);
      }
    };

    fetchVideos();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">All Videos</h1>
          <span className="text-sm text-gray-500">{videos.length} videos</span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {fetching ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="h-32 bg-gray-200 rounded-lg mb-3" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🎬</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No videos yet</h2>
            <p className="text-gray-500 mb-6">Be the first to upload a video</p>
            {isLoggedIn ? (
              <Link
                href="/upload"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Upload Video
              </Link>
            ) : (
              <Link
                href="/auth/register"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Sign up to upload
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

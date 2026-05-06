'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { videosApi, type Video } from '@/lib/api';
import VideoThumbnail from '@/components/VideoThumbnail';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function formatViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

export default function ShortsPage() {
  const [shorts, setShorts] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    videosApi.getShorts()
      .then((data: Video[]) => setShorts(data.filter(v => v.isShort)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <div className="sticky top-14 z-30 border-b px-6 py-3 flex items-center gap-3"
        style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
        <span className="text-2xl">📱</span>
        <div>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">Shorts</h1>
          <p className="text-xs text-gray-500">Short vertical videos ≤ 60 seconds</p>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[9/16] rounded-xl bg-gray-200" />
                <div className="h-3 bg-gray-200 rounded mt-2 w-3/4" />
                <div className="h-3 bg-gray-200 rounded mt-1 w-1/2" />
              </div>
            ))}
          </div>
        ) : shorts.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">📱</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No Shorts yet</h2>
            <p className="text-gray-500 mb-6">
              Upload a vertical video (9:16) under 60 seconds to create a Short
            </p>
            <Link href="/upload"
              className="bg-blue-600 text-white px-6 py-2.5 rounded-full font-medium hover:bg-blue-700 transition-colors">
              Upload a Short
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {shorts.map(video => (
              <Link key={video.id} href={`/videos/${video.id}`}
                className="group block">
                {/* Portrait thumbnail */}
                <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-gray-900">
                  <VideoThumbnail
                    thumbnailUrl={video.thumbnailUrl}
                    filePath={video.filePath}
                    title={video.title}
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  {/* Shorts badge */}
                  <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    SHORT
                  </div>
                  {/* Duration */}
                  {video.duration && (
                    <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                      {video.duration}s
                    </span>
                  )}
                </div>
                {/* Info */}
                <div className="mt-2 px-0.5">
                  <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
                    {video.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {video.viewCount > 0 ? `${formatViews(video.viewCount)} views` : video.user.name}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

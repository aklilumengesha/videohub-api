'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { analyticsApi } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Overview {
  totalVideos: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  subscribers: number;
}

interface VideoStat {
  id: string;
  title: string;
  thumbnailUrl?: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  status: string;
  createdAt: string;
}

interface DayView {
  date: string;
  views: number;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { isLoggedIn, loading: authLoading } = useAuth();

  const [overview, setOverview] = useState<Overview | null>(null);
  const [videos, setVideos] = useState<VideoStat[]>([]);
  const [dailyViews, setDailyViews] = useState<DayView[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.push('/auth/login');
  }, [isLoggedIn, authLoading, router]);

  useEffect(() => {
    if (!isLoggedIn) return;
    Promise.all([
      analyticsApi.getOverview(),
      analyticsApi.getVideoStats(),
      analyticsApi.getDailyViews(days),
    ])
      .then(([o, v, d]) => { setOverview(o); setVideos(v); setDailyViews(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoggedIn, days]);

  if (authLoading || (!isLoggedIn && !authLoading)) return null;

  const maxViews = Math.max(...dailyViews.map(d => d.views), 1);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <Link href="/channel" className="text-sm text-blue-600 hover:underline">← My Channel</Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">Loading...</div>
        ) : (
          <>
            {/* Overview cards */}
            {overview && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {[
                  { label: 'Videos',      value: overview.totalVideos,   icon: '🎬' },
                  { label: 'Total Views', value: overview.totalViews.toLocaleString(),   icon: '👁' },
                  { label: 'Likes',       value: overview.totalLikes.toLocaleString(),   icon: '❤️' },
                  { label: 'Comments',    value: overview.totalComments.toLocaleString(), icon: '💬' },
                  { label: 'Subscribers', value: overview.subscribers.toLocaleString(),  icon: '👥' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 text-center">
                    <div className="text-2xl mb-1">{s.icon}</div>
                    <div className="text-xl font-bold text-gray-900">{s.value}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Views chart */}
            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Views over time</h2>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                  {[7, 30, 90].map(d => (
                    <button key={d} onClick={() => setDays(d)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        days === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}>
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              {dailyViews.every(d => d.views === 0) ? (
                <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
                  No view data yet — views will appear here once your videos are watched
                </div>
              ) : (
                <div className="flex items-end gap-0.5 h-32">
                  {dailyViews.map(day => {
                    const height = maxViews > 0 ? Math.max(2, Math.round((day.views / maxViews) * 100)) : 2;
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div
                          className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-default"
                          style={{ height: `${height}%` }}
                        />
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          {day.date}: {day.views} views
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* X-axis labels — show first, middle, last */}
              {dailyViews.length > 0 && (
                <div className="flex justify-between mt-2 text-xs text-gray-400">
                  <span>{dailyViews[0]?.date}</span>
                  <span>{dailyViews[Math.floor(dailyViews.length / 2)]?.date}</span>
                  <span>{dailyViews[dailyViews.length - 1]?.date}</span>
                </div>
              )}
            </div>

            {/* Video table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Video Performance</h2>
              </div>

              {videos.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <div className="text-3xl mb-2">🎬</div>
                  <p>No videos yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {videos.map(video => (
                    <div key={video.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                      {/* Thumbnail */}
                      <Link href={`/videos/${video.id}`} className="relative w-20 h-12 flex-shrink-0 rounded overflow-hidden bg-gray-900">
                        {video.thumbnailUrl ? (
                          <Image src={`${API_URL}/${video.thumbnailUrl}`} alt={video.title} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center">
                            <span className="text-lg opacity-60">🎥</span>
                          </div>
                        )}
                      </Link>

                      {/* Title */}
                      <div className="flex-1 min-w-0">
                        <Link href={`/videos/${video.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate block">
                          {video.title}
                        </Link>
                        <p className="text-xs text-gray-400">{new Date(video.createdAt).toLocaleDateString()}</p>
                      </div>

                      {/* Stats */}
                      <div className="hidden sm:flex items-center gap-6 text-sm text-gray-600 flex-shrink-0">
                        <div className="text-center">
                          <div className="font-semibold">{video.viewCount.toLocaleString()}</div>
                          <div className="text-xs text-gray-400">Views</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold">{video.likeCount.toLocaleString()}</div>
                          <div className="text-xs text-gray-400">Likes</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold">{video.commentCount.toLocaleString()}</div>
                          <div className="text-xs text-gray-400">Comments</div>
                        </div>
                      </div>

                      {/* Status badge */}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                        video.status === 'READY' ? 'bg-green-100 text-green-700' :
                        video.status === 'PROCESSING' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {video.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

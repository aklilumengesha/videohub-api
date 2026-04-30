'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { analyticsApi, usersApi } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function formatViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

function formatDuration(s?: number) {
  if (!s) return '0:00';
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { isLoggedIn, loading: authLoading } = useAuth();
  const [overview, setOverview] = useState<any>(null);
  const [videoStats, setVideoStats] = useState<any[]>([]);
  const [dailyViews, setDailyViews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.push('/auth/login');
  }, [isLoggedIn, authLoading, router]);

  useEffect(() => {
    if (!isLoggedIn) return;
    setLoading(true);
    Promise.all([
      analyticsApi.getOverview(),
      analyticsApi.getVideoStats(),
      analyticsApi.getDailyViews(days),
    ]).then(([ov, vs, dv]) => {
      setOverview(ov);
      setVideoStats(vs || []);
      setDailyViews(dv || []);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoggedIn, days]);

  if (authLoading || !isLoggedIn) return null;

  const maxViews = dailyViews.length > 0 ? Math.max(...dailyViews.map((d: any) => d.views || 0), 1) : 1;

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-sm text-gray-500 mt-1">Track your channel performance</p>
          </div>
          <Link href="/studio" className="text-sm text-blue-600 hover:underline">← Creator Studio</Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl bg-gray-200 animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-6">

            {/* Overview cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Views', value: formatViews(overview?.totalViews || 0), icon: '👁', color: 'blue' },
                { label: 'Total Likes', value: formatViews(overview?.totalLikes || 0), icon: '👍', color: 'green' },
                { label: 'Total Comments', value: formatViews(overview?.totalComments || 0), icon: '💬', color: 'purple' },
                { label: 'Total Videos', value: overview?.totalVideos || 0, icon: '🎬', color: 'orange' },
              ].map(card => (
                <div key={card.label} className="rounded-xl p-5" style={{ background: 'var(--background)' }}>
                  <div className="text-2xl mb-2">{card.icon}</div>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{card.label}</p>
                </div>
              ))}
            </div>

            {/* Daily views chart */}
            {dailyViews.length > 0 && (
              <div className="rounded-xl p-6" style={{ background: 'var(--background)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900">Views over time</h2>
                  <div className="flex gap-2">
                    {[7, 30, 90].map(d => (
                      <button key={d} onClick={() => setDays(d)}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                          days === d ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}>
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bar chart */}
                <div className="flex items-end gap-1 h-32">
                  {dailyViews.slice(-days).map((day: any, i: number) => {
                    const height = maxViews > 0 ? Math.max((day.views / maxViews) * 100, 2) : 2;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          {day.views} views
                        </div>
                        <div
                          className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-default"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>{dailyViews[0]?.date ? new Date(dailyViews[0].date).toLocaleDateString() : ''}</span>
                  <span>{dailyViews[dailyViews.length - 1]?.date ? new Date(dailyViews[dailyViews.length - 1].date).toLocaleDateString() : ''}</span>
                </div>
              </div>
            )}

            {/* Top videos table */}
            {videoStats.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ background: 'var(--background)' }}>
                <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                  <h2 className="font-bold text-gray-900">Top Videos</h2>
                </div>
                <table className="w-full">
                  <thead className="border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Video</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Views</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Likes</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Comments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {videoStats.slice(0, 10).map((v: any) => (
                      <tr key={v.id} className="hover:bg-gray-100 transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            {v.thumbnailUrl && (
                              <img src={`${API_URL}/${v.thumbnailUrl}`} alt={v.title}
                                className="w-16 h-10 rounded object-cover flex-shrink-0" />
                            )}
                            <Link href={`/videos/${v.id}`}
                              className="text-sm font-medium text-gray-900 hover:text-blue-600 line-clamp-1">
                              {v.title}
                            </Link>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right text-sm text-gray-700">{formatViews(v.viewCount)}</td>
                        <td className="px-6 py-3 text-right text-sm text-gray-700">{v.likeCount}</td>
                        <td className="px-6 py-3 text-right text-sm text-gray-700">{v.commentCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Engagement rate */}
            {overview && overview.totalViews > 0 && (
              <div className="rounded-xl p-6" style={{ background: 'var(--background)' }}>
                <h2 className="font-bold text-gray-900 mb-4">Engagement Rate</h2>
                <div className="space-y-4">
                  {[
                    { label: 'Like rate', value: (overview.totalLikes / overview.totalViews) * 100, color: 'bg-green-500' },
                    { label: 'Comment rate', value: (overview.totalComments / overview.totalViews) * 100, color: 'bg-blue-500' },
                  ].map(metric => (
                    <div key={metric.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{metric.label}</span>
                        <span className="font-semibold text-gray-900">{metric.value.toFixed(2)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className={`${metric.color} h-2 rounded-full transition-all`}
                          style={{ width: `${Math.min(metric.value * 10, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

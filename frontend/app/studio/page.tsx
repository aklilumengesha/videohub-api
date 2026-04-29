'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { analyticsApi, videosApi, usersApi, type Video } from '@/lib/api';

function formatViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

function formatDuration(s?: number) {
  if (!s) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}

export default function StudioPage() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'videos' | 'analytics'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/auth/login');
      return;
    }

    Promise.all([
      analyticsApi.getOverview(),
      usersApi.getMe().then(user => {
        setCurrentUser(user);
        return usersApi.getUserVideos(user.id);
      }),
    ]).then(([analyticsData, userVideos]) => {
      setAnalytics(analyticsData);
      setVideos(userVideos);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoggedIn, router]);

  const toggleVideoSelection = (videoId: string) => {
    const newSet = new Set(selectedVideos);
    if (newSet.has(videoId)) {
      newSet.delete(videoId);
    } else {
      newSet.add(videoId);
    }
    setSelectedVideos(newSet);
  };

  const selectAll = () => {
    if (selectedVideos.size === videos.length) {
      setSelectedVideos(new Set());
    } else {
      setSelectedVideos(new Set(videos.map(v => v.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedVideos.size} video(s)?`)) return;
    
    for (const videoId of selectedVideos) {
      await videosApi.remove(videoId).catch(() => {});
    }
    
    setVideos(prev => prev.filter(v => !selectedVideos.has(v.id)));
    setSelectedVideos(new Set());
  };

  const openEdit = (video: Video) => {
    setEditingVideo(video);
    setEditTitle(video.title);
    setEditDesc(video.description || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo || !editTitle.trim()) return;
    setSaving(true);
    try {
      const updated = await videosApi.update(editingVideo.id, { title: editTitle.trim(), description: editDesc.trim() });
      setVideos(prev => prev.map(v => v.id === editingVideo.id ? { ...v, ...updated } : v));
      setEditingVideo(null);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Creator Studio</h1>
          <p className="text-sm text-gray-500">Manage your content and track performance</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          <button onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'dashboard' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}>
            Dashboard
          </button>
          <button onClick={() => setActiveTab('videos')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'videos' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}>
            Videos ({videos.length})
          </button>
          <button onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'analytics' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}>
            Analytics
          </button>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && analytics && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-xl p-6" style={{ background: 'var(--background)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Total Views</span>
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-gray-900">{formatViews(analytics.totalViews || 0)}</p>
              </div>

              <div className="rounded-xl p-6" style={{ background: 'var(--background)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Subscribers</span>
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-gray-900">{formatViews(currentUser?.subscriberCount || 0)}</p>
              </div>

              <div className="rounded-xl p-6" style={{ background: 'var(--background)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Total Videos</span>
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-gray-900">{videos.length}</p>
              </div>

              <div className="rounded-xl p-6" style={{ background: 'var(--background)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Total Likes</span>
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-gray-900">{formatViews(analytics.totalLikes || 0)}</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl p-6" style={{ background: 'var(--background)' }}>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/upload"
                  className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-600 hover:bg-blue-50 transition-colors group">
                  <div className="w-12 h-12 rounded-full bg-blue-100 group-hover:bg-blue-600 flex items-center justify-center transition-colors">
                    <svg className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Upload Video</p>
                    <p className="text-xs text-gray-500">Share new content</p>
                  </div>
                </Link>

                <Link href="/playlists"
                  className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-600 hover:bg-purple-50 transition-colors group">
                  <div className="w-12 h-12 rounded-full bg-purple-100 group-hover:bg-purple-600 flex items-center justify-center transition-colors">
                    <svg className="w-6 h-6 text-purple-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Manage Playlists</p>
                    <p className="text-xs text-gray-500">Organize your videos</p>
                  </div>
                </Link>

                <button onClick={() => setActiveTab('analytics')}
                  className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-green-600 hover:bg-green-50 transition-colors group">
                  <div className="w-12 h-12 rounded-full bg-green-100 group-hover:bg-green-600 flex items-center justify-center transition-colors">
                    <svg className="w-6 h-6 text-green-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">View Analytics</p>
                    <p className="text-xs text-gray-500">Track performance</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Top Performing Video */}
            {analytics.topVideo && (
              <div className="rounded-xl p-6" style={{ background: 'var(--background)' }}>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Top Performing Video</h2>
                <Link href={`/videos/${analytics.topVideo.id}`}
                  className="flex gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-40 h-24 rounded-lg bg-gray-900 flex-shrink-0 overflow-hidden">
                    {analytics.topVideo.thumbnailUrl && (
                      <img src={`${process.env.NEXT_PUBLIC_API_URL}/${analytics.topVideo.thumbnailUrl}`}
                        alt={analytics.topVideo.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{analytics.topVideo.title}</h3>
                    <div className="flex gap-4 text-sm text-gray-500">
                      <span>{formatViews(analytics.topVideo.viewCount)} views</span>
                      <span>{analytics.topVideo.likeCount} likes</span>
                      <span>{analytics.topVideo.commentCount} comments</span>
                    </div>
                  </div>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Videos Tab */}
        {activeTab === 'videos' && (
          <div className="space-y-4">
            {/* Bulk Actions Bar */}
            {selectedVideos.size > 0 && (
              <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: 'var(--background)' }}>
                <span className="text-sm font-medium text-gray-700">{selectedVideos.size} selected</span>
                <div className="flex gap-2">
                  <button onClick={handleBulkDelete}
                    className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    Delete Selected
                  </button>
                  <button onClick={() => setSelectedVideos(new Set())}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    Clear Selection
                  </button>
                </div>
              </div>
            )}

            {/* Videos Table */}
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--background)' }}>
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input type="checkbox" checked={selectedVideos.size === videos.length && videos.length > 0}
                        onChange={selectAll}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Video</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Views</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Likes</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Comments</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {videos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No videos yet. <Link href="/upload" className="text-blue-600 hover:underline">Upload your first video</Link>
                      </td>
                    </tr>
                  ) : videos.map(video => (
                    <tr key={video.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedVideos.has(video.id)}
                          onChange={() => toggleVideoSelection(video.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-3">
                          <div className="w-24 h-14 rounded bg-gray-900 flex-shrink-0 overflow-hidden">
                            {video.thumbnailUrl && (
                              <img src={`${process.env.NEXT_PUBLIC_API_URL}/${video.thumbnailUrl}`}
                                alt={video.title} className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link href={`/videos/${video.id}`}
                              className="text-sm font-medium text-gray-900 hover:text-blue-600 line-clamp-2">
                              {video.title}
                            </Link>
                            {video.duration && (
                              <p className="text-xs text-gray-500 mt-0.5">{formatDuration(video.duration)}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          video.status === 'READY' ? 'bg-green-100 text-green-700' :
                          video.status === 'PROCESSING' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {video.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatViews(video.viewCount)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{video.likeCount}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{video.commentCount}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link href={`/videos/${video.id}`}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                            View
                          </Link>
                          <button onClick={() => openEdit(video)}
                            className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                            Edit
                          </button>
                          <button onClick={async () => {
                            if (confirm('Delete this video?')) {
                              await videosApi.remove(video.id);
                              setVideos(prev => prev.filter(v => v.id !== video.id));
                            }
                          }}
                            className="text-red-600 hover:text-red-700 text-sm font-medium">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            <div className="rounded-xl p-6" style={{ background: 'var(--background)' }}>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Channel Analytics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-3">Overview</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Views</span>
                      <span className="text-sm font-semibold text-gray-900">{formatViews(analytics.totalViews || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Likes</span>
                      <span className="text-sm font-semibold text-gray-900">{formatViews(analytics.totalLikes || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Comments</span>
                      <span className="text-sm font-semibold text-gray-900">{formatViews(analytics.totalComments || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Avg. Views per Video</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {videos.length > 0 ? formatViews(Math.floor((analytics.totalViews || 0) / videos.length)) : '0'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-3">Engagement Rate</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">Likes</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {analytics.totalViews > 0 ? ((analytics.totalLikes / analytics.totalViews) * 100).toFixed(1) : '0'}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${analytics.totalViews > 0 ? Math.min(((analytics.totalLikes / analytics.totalViews) * 100), 100) : 0}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">Comments</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {analytics.totalViews > 0 ? ((analytics.totalComments / analytics.totalViews) * 100).toFixed(1) : '0'}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${analytics.totalViews > 0 ? Math.min(((analytics.totalComments / analytics.totalViews) * 100), 100) : 0}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Edit Video Modal */}
    {editingVideo && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={() => setEditingVideo(null)}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6"
          style={{ background: 'var(--background)' }}
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Edit Video</h3>
            <button onClick={() => setEditingVideo(null)}
              className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
                required maxLength={100}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)}
                rows={4} maxLength={500}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setEditingVideo(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving || !editTitle.trim()}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  );
}

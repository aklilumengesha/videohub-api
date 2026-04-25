'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { usersApi, videosApi, type Video } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Me {
  id: string;
  name: string;
  email: string;
  bio?: string;
  createdAt: string;
}

export default function ChannelPage() {
  const router = useRouter();
  const { isLoggedIn, loading: authLoading } = useAuth();

  const [me, setMe] = useState<Me | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.push('/auth/login');
  }, [isLoggedIn, authLoading, router]);

  useEffect(() => {
    if (!isLoggedIn) return;
    Promise.all([usersApi.getMe(), usersApi.getMe().then(u => usersApi.getUserVideos(u.id))])
      .then(([profile]) => {
        setMe(profile);
        setEditName(profile.name);
        setEditBio(profile.bio ?? '');
        return usersApi.getUserVideos(profile.id);
      })
      .then(setVideos)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await usersApi.updateMe({ name: editName, bio: editBio });
      setMe(prev => prev ? { ...prev, ...updated } : prev);
      setEditing(false);
      setSaveMsg('Profile updated!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const handleDelete = async (videoId: string) => {
    try {
      await videosApi.remove(videoId);
      setVideos(prev => prev.filter(v => v.id !== videoId));
      setDeletingId(null);
    } catch { /* ignore */ }
  };

  if (authLoading || (!isLoggedIn && !authLoading)) return null;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-400">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Channel header */}
        <div className="bg-white rounded-xl overflow-hidden shadow-sm">
          {/* Banner */}
          <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600" />

          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-10 mb-4">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-full bg-white border-4 border-white shadow-md flex items-center justify-center text-3xl font-bold text-blue-600 bg-blue-100">
                {me?.name.charAt(0).toUpperCase()}
              </div>

              {/* Edit button */}
              {!editing ? (
                <button onClick={() => setEditing(true)}
                  className="px-4 py-2 border border-gray-300 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors">
                  Edit profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setEditing(false)}
                    className="px-4 py-2 border border-gray-300 rounded-full text-sm font-medium hover:bg-gray-50">
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)} maxLength={50}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Bio</label>
                  <textarea value={editBio} onChange={e => setEditBio(e.target.value)} rows={3} maxLength={200}
                    placeholder="Tell viewers about your channel"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-xl font-bold text-gray-900">{me?.name}</h1>
                <p className="text-sm text-gray-500">{me?.email}</p>
                {me?.bio && <p className="text-sm text-gray-600 mt-1">{me.bio}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  {videos.length} videos · Joined {me ? new Date(me.createdAt).toLocaleDateString() : ''}
                </p>
              </div>
            )}

            {saveMsg && <p className="text-sm text-green-600 mt-2">{saveMsg}</p>}
          </div>
        </div>

        {/* Videos section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Videos ({videos.length})</h2>
            <Link href="/upload"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-colors">
              + Upload
            </Link>
          </div>

          {videos.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <div className="text-5xl mb-3">🎬</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No videos yet</h3>
              <p className="text-gray-500 mb-4">Upload your first video to get started</p>
              <Link href="/upload" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700">
                Upload Video
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map(video => (
                <div key={video.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 group">
                  {/* Thumbnail */}
                  <Link href={`/videos/${video.id}`}>
                    <div className="relative aspect-video bg-gray-900">
                      {video.thumbnailUrl ? (
                        <Image src={`${API_URL}/${video.thumbnailUrl}`} alt={video.title} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-700">
                          <span className="text-3xl opacity-60">🎥</span>
                        </div>
                      )}
                      {/* Status badge */}
                      {video.status !== 'READY' && (
                        <div className={`absolute top-2 left-2 text-xs font-medium px-2 py-0.5 rounded ${
                          video.status === 'PROCESSING' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'
                        }`}>
                          {video.status}
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="p-3">
                    <h3 className="font-medium text-gray-900 truncate text-sm mb-1">{video.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                      <span>👁 {video.viewCount?.toLocaleString() ?? 0}</span>
                      <span>❤️ {video.likeCount}</span>
                      <span>💬 {video.commentCount}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link href={`/videos/${video.id}`}
                        className="flex-1 text-center text-xs py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        View
                      </Link>
                      <button onClick={() => setDeletingId(video.id)}
                        className="flex-1 text-center text-xs py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete confirmation modal */}
        {deletingId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete video?</h3>
              <p className="text-gray-500 text-sm mb-4">This action cannot be undone. The video and all its comments will be permanently deleted.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingId(null)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={() => handleDelete(deletingId)}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

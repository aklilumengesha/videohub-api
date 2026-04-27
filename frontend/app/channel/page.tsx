'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { usersApi, videosApi, type Video } from '@/lib/api';
import VideoCard from '@/components/VideoCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Me {
  id: string;
  name: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: string;
}

export default function ChannelPage() {
  const router = useRouter();
  const { isLoggedIn, loading: authLoading } = useAuth();

  const [me, setMe] = useState<Me | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.push('/auth/login');
  }, [isLoggedIn, authLoading, router]);

  useEffect(() => {
    if (!isLoggedIn) return;
    usersApi.getMe()
      .then(profile => {
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const updated = await usersApi.uploadAvatar(file);
      setMe(prev => prev ? { ...prev, avatarUrl: updated.avatarUrl } : prev);
      setSaveMsg('Avatar updated!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch { /* ignore */ }
    finally { setAvatarUploading(false); }
  };

  if (authLoading || (!isLoggedIn && !authLoading)) return null;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      {/* Banner */}
      <div className="h-36 sm:h-48 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500" />

      <div className="max-w-[1200px] mx-auto px-4">
        {/* Channel header */}
        <div className="flex items-end gap-5 -mt-10 mb-6 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
          {/* Avatar with upload */}
          <div className="relative group flex-shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4"
              style={{ borderColor: 'var(--background)' }}>
              {me?.avatarUrl ? (
                <Image
                  src={`${API_URL}/${me.avatarUrl}`}
                  alt={me.name}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                  {me?.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium"
            >
              {avatarUploading ? '...' : '📷'}
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pb-1">
            {editing ? (
              <div className="space-y-2 max-w-md">
                <input value={editName} onChange={e => setEditName(e.target.value)} maxLength={50}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <textarea value={editBio} onChange={e => setEditBio(e.target.value)} rows={2} maxLength={200}
                  placeholder="Channel description"
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            ) : (
              <>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{me?.name}</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {me?.email} · {videos.length} video{videos.length !== 1 ? 's' : ''}
                </p>
                {me?.bio && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{me.bio}</p>}
              </>
            )}
            {saveMsg && <p className="text-xs text-green-600 mt-1">{saveMsg}</p>}
          </div>

          {/* Edit / Save buttons */}
          <div className="flex gap-2 flex-shrink-0 pb-1">
            {editing ? (
              <>
                <button onClick={() => setEditing(false)}
                  className="px-4 py-2 rounded-full border border-gray-300 text-sm font-medium hover:bg-gray-100 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)}
                className="px-4 py-2 rounded-full border border-gray-300 text-sm font-medium hover:bg-gray-100 transition-colors">
                Edit profile
              </button>
            )}
          </div>
        </div>

        {/* Videos section */}
        <div className="pb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900">Your Videos ({videos.length})</h2>
            <Link href="/upload"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-colors">
              + Upload
            </Link>
          </div>

          {videos.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-3">🎬</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No videos yet</h3>
              <p className="text-gray-500 mb-4">Upload your first video to get started</p>
              <Link href="/upload" className="bg-blue-600 text-white px-6 py-2.5 rounded-full font-medium hover:bg-blue-700 transition-colors">
                Upload Video
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
              {videos.map(video => (
                <div key={video.id} className="relative group/card">
                  <VideoCard video={video} showChannel={false} />
                  {/* Delete overlay on hover */}
                  <button
                    onClick={() => setDeletingId(video.id)}
                    className="absolute top-2 right-2 z-10 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl p-6 max-w-sm w-full shadow-xl" style={{ background: 'var(--background)' }}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete video?</h3>
            <p className="text-gray-500 text-sm mb-4">This action cannot be undone.</p>
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
    </div>
  );
}

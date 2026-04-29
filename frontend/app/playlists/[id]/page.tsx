'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { playlistsApi, usersApi, type Playlist } from '@/lib/api';
import VideoThumbnail from '@/components/VideoThumbnail';

function formatDuration(s?: number) {
  if (!s) return '';
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isLoggedIn } = useAuth();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPublic, setEditPublic] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    playlistsApi.getOne(id)
      .then((data: Playlist) => setPlaylist(data))
      .catch(() => setError('Playlist not found'))
      .finally(() => setLoading(false));
    if (isLoggedIn) {
      usersApi.getMe().then((u: any) => setCurrentUserId(u.id)).catch(() => {});
    }
  }, [id, isLoggedIn]);

  const handleRemove = async (videoId: string) => {
    try {
      await playlistsApi.removeVideo(id, videoId);
      setPlaylist(prev => prev ? {
        ...prev,
        videos: prev.videos?.filter(v => v.video.id !== videoId),
      } : prev);
    } catch { /* ignore */ }
  };

  const openEdit = () => {
    if (!playlist) return;
    setEditTitle(playlist.title);
    setEditDesc(playlist.description || '');
    setEditPublic(playlist.isPublic);
    setEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      const updated = await playlistsApi.update(id, {
        title: editTitle.trim(),
        description: editDesc.trim(),
        isPublic: editPublic,
      });
      setPlaylist(prev => prev ? { ...prev, ...updated } : prev);
      setEditing(false);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !playlist) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 mb-4">{error || 'Playlist not found'}</p>
        <Link href="/playlists" className="text-blue-600 hover:underline">← Back to playlists</Link>
      </div>
    </div>
  );

  const isOwner = isLoggedIn && playlist.user && currentUserId === playlist.user.id;

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <main className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="rounded-xl p-6 mb-6 border" style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
          {editing ? (
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
                required maxLength={100} autoFocus
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)}
                rows={2} maxLength={300} placeholder="Description (optional)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={editPublic} onChange={e => setEditPublic(e.target.checked)} className="rounded" />
                Public playlist
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving || !editTitle.trim()}
                  className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{playlist.title}</h1>
                {playlist.description && <p className="text-gray-500 text-sm mt-1">{playlist.description}</p>}
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  {playlist.user && (
                    <Link href={`/profile/${playlist.user.id}`} className="text-blue-600 hover:underline font-medium">
                      {playlist.user.name}
                    </Link>
                  )}
                  <span>{playlist.videos?.length ?? 0} videos</span>
                  <span>{playlist.isPublic ? '🌐 Public' : '🔒 Private'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isOwner && (
                  <button onClick={openEdit}
                    className="text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                    Edit
                  </button>
                )}
                <Link href="/playlists" className="text-sm text-gray-400 hover:text-gray-600">← Back</Link>
              </div>
            </div>
          )}
        </div>

        {/* Video list */}
        {!playlist.videos || playlist.videos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-2">📭</div>
            <p>No videos in this playlist yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {playlist.videos.map((item, idx) => (
              <div key={item.video.id} className="flex gap-4 rounded-xl p-3 border"
                style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
                <span className="text-sm text-gray-400 w-5 flex-shrink-0 pt-1">{idx + 1}</span>
                <Link href={`/videos/${item.video.id}`}
                  className="relative w-32 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-900">
                  <VideoThumbnail
                    thumbnailUrl={item.video.thumbnailUrl}
                    title={item.video.title}
                    className="object-cover"
                  />
                  {item.video.duration && (
                    <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                      {formatDuration(item.video.duration)}
                    </span>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/videos/${item.video.id}`}>
                    <h3 className="font-semibold text-gray-900 truncate hover:text-blue-600">{item.video.title}</h3>
                  </Link>
                  <p className="text-sm text-blue-600 mt-0.5">{item.video.user.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">👁 {item.video.viewCount.toLocaleString()}</p>
                </div>
                {isOwner && (
                  <button onClick={() => handleRemove(item.video.id)}
                    className="text-gray-300 hover:text-red-400 text-sm flex-shrink-0 self-start mt-1 transition-colors"
                    title="Remove from playlist">
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

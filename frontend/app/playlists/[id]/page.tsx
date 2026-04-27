'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { playlistsApi, type Playlist } from '@/lib/api';
import VideoThumbnail from '@/components/VideoThumbnail';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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

  useEffect(() => {
    playlistsApi.getOne(id)
      .then((data: Playlist) => setPlaylist(data))
      .catch(() => setError('Playlist not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleRemove = async (videoId: string) => {
    try {
      await playlistsApi.removeVideo(id, videoId);
      setPlaylist(prev => prev ? {
        ...prev,
        videos: prev.videos?.filter(v => v.video.id !== videoId),
      } : prev);
    } catch { /* ignore */ }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;

  if (error || !playlist) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 mb-4">{error || 'Playlist not found'}</p>
        <Link href="/playlists" className="text-blue-600 hover:underline">← Back to playlists</Link>
      </div>
    </div>
  );

  const isOwner = isLoggedIn && playlist.user;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl p-6 mb-6 border border-gray-100">
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
            <Link href="/playlists" className="text-sm text-gray-400 hover:text-gray-600 flex-shrink-0">
              ← Back
            </Link>
          </div>
        </div>

        {/* Videos */}
        {!playlist.videos || playlist.videos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-2">📭</div>
            <p>No videos in this playlist yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {playlist.videos.map((item, idx) => (
              <div key={item.video.id} className="flex gap-4 bg-white rounded-xl p-3 border border-gray-100">
                <span className="text-sm text-gray-400 w-5 flex-shrink-0 pt-1">{idx + 1}</span>
                <Link href={`/videos/${item.video.id}`} className="relative w-32 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-900">
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
                  <button
                    onClick={() => handleRemove(item.video.id)}
                    className="text-gray-300 hover:text-red-400 text-sm flex-shrink-0 self-start mt-1 transition-colors"
                    title="Remove from playlist"
                  >
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

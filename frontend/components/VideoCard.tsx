'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { playlistsApi, type Video, type Playlist } from '@/lib/api';
import VideoThumbnail from './VideoThumbnail';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  return `${Math.floor(months / 12)} year${Math.floor(months / 12) !== 1 ? 's' : ''} ago`;
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K views`;
  return `${n} view${n !== 1 ? 's' : ''}`;
}

interface VideoCardProps {
  video: Video;
  showChannel?: boolean;
  progress?: number; // seconds watched — renders a progress bar on the thumbnail
}

export default function VideoCard({ video, showChannel = true, progress }: VideoCardProps) {
  const duration = formatDuration(video.duration);
  const progressPct = progress && video.duration ? Math.min(100, (progress / video.duration) * 100) : 0;
  const [showPreview, setShowPreview] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [myPlaylists, setMyPlaylists] = useState<Playlist[]>([]);
  const [playlistsLoaded, setPlaylistsLoaded] = useState(false);
  const [savingTo, setSavingTo] = useState<string | null>(null);
  const [savedTo, setSavedTo] = useState<string | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isLoggedIn } = useAuth();
  const router = useRouter();

  const handleOpenSaveMenu = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) { router.push('/auth/login'); return; }
    setShowSaveMenu(v => !v);
    if (!playlistsLoaded) {
      const data: Playlist[] = await playlistsApi.getMine().catch(() => []);
      setMyPlaylists(data);
      setPlaylistsLoaded(true);
    }
  };

  const handleSaveToPlaylist = async (e: React.MouseEvent, playlistId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSavingTo(playlistId);
    try {
      await playlistsApi.addVideo(playlistId, video.id);
      setSavedTo(playlistId);
      setTimeout(() => { setSavedTo(null); setShowSaveMenu(false); }, 1200);
    } catch { /* ignore */ }
    finally { setSavingTo(null); }
  };

  const handleWatchLater = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) { router.push('/auth/login'); return; }
    setSavingTo('wl');
    try {
      await playlistsApi.saveToWatchLater(video.id);
      setSavedTo('wl');
      setTimeout(() => { setSavedTo(null); setShowSaveMenu(false); }, 1200);
    } catch { /* ignore */ }
    finally { setSavingTo(null); }
  };

  // Video source for preview — prefer filePath (direct), skip HLS (too slow to start)
  const previewSrc = video.filePath ? `${API_URL}/${video.filePath}` : null;

  const handleMouseEnter = useCallback(() => {
    if (!previewSrc) return;
    hoverTimerRef.current = setTimeout(() => {
      setShowPreview(true);
      setTimeout(() => { videoRef.current?.play().catch(() => {}); }, 50);
    }, 1000);
  }, [previewSrc]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
    setShowPreview(false);
    setShowSaveMenu(false);
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
  }, []);

  return (
    <Link href={`/videos/${video.id}`} className="group block"
      aria-label={`Watch ${video.title}${video.user ? ` by ${video.user.name}` : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      {/* Thumbnail / Preview */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-900">
        {/* Static thumbnail */}
        <div className={`absolute inset-0 transition-opacity duration-300 ${showPreview ? 'opacity-0' : 'opacity-100'}`}>
          <VideoThumbnail
            thumbnailUrl={video.thumbnailUrl}
            filePath={video.filePath}
            title={video.title}
            className="object-cover group-hover:scale-105 transition-transform duration-200"
          />
        </div>

        {/* Muted video preview */}
        {previewSrc && (
          <video ref={videoRef} src={previewSrc} muted loop playsInline preload="none"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${showPreview ? 'opacity-100' : 'opacity-0'}`}
          />
        )}

        {/* Duration badge */}
        {duration && (
          <span className="absolute bottom-1.5 right-1.5 bg-black/90 text-white text-xs font-medium px-1.5 py-0.5 rounded z-10">
            {duration}
          </span>
        )}

        {/* Save to playlist button — appears on hover */}
        <div className="absolute top-2 right-2 z-20">
          <button
            onClick={handleOpenSaveMenu}
            title="Save to playlist"
            aria-label="Save to playlist"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 bg-black/70 text-white hover:bg-black ${
              showSaveMenu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>

          {/* Dropdown */}
          {showSaveMenu && (
            <div className="absolute right-0 top-9 w-52 rounded-xl shadow-xl border py-1 text-sm"
              style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
              {/* Watch Later shortcut */}
              <button onClick={handleWatchLater}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors flex items-center gap-2 text-gray-700">
                {savedTo === 'wl' ? (
                  <><svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>Saved</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>Watch Later</>
                )}
              </button>

              {myPlaylists.length > 0 && (
                <div className="border-t my-1" style={{ borderColor: 'var(--border)' }} />
              )}

              {!playlistsLoaded ? (
                <div className="px-4 py-2 text-gray-400 text-xs">Loading...</div>
              ) : myPlaylists.map(pl => (
                <button key={pl.id} onClick={e => handleSaveToPlaylist(e, pl.id)}
                  disabled={savingTo === pl.id}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors flex items-center gap-2 text-gray-700 disabled:opacity-50">
                  {savedTo === pl.id ? (
                    <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  ) : (
                    <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                  )}
                  <span className="truncate">{pl.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Processing overlay */}
        {video.status === 'PROCESSING' && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl z-10">
            <span className="text-white text-xs font-medium bg-yellow-500 px-2 py-1 rounded">Processing...</span>
          </div>
        )}

        {/* Watch progress bar */}
        {progressPct > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 z-10">
            <div className="h-full bg-red-600 rounded-full" style={{ width: `${progressPct}%` }} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-3 flex gap-3">
        {showChannel && (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0 flex items-center justify-center text-white text-sm font-bold mt-0.5">
            {video.user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug mb-1">{video.title}</h3>
          {showChannel && (
            <p className="text-xs text-gray-500 hover:text-gray-700 truncate mb-0.5">{video.user.name}</p>
          )}
          <p className="text-xs text-gray-500">
            {video.viewCount > 0 ? `${formatViews(video.viewCount)} · ` : ''}
            {timeAgo(video.createdAt)}
          </p>
          {video.category && (
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
              {video.category}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

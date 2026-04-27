'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { videosApi, likesApi, commentsApi, playlistsApi, adminApi, type Video, type Comment, type Playlist, type VideoChapter, type VideoSubtitle } from '@/lib/api';
import HlsPlayer from '@/components/HlsPlayer';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function formatDuration(s?: number) {
  if (!s) return '';
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isLoggedIn } = useAuth();

  const [video, setVideo] = useState<Video | null>(null);
  const [related, setRelated] = useState<Video[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [error, setError] = useState('');
  const commentInputRef = useRef<HTMLInputElement>(null);

  // Save to playlist
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistsLoaded, setPlaylistsLoaded] = useState(false);
  const [savingTo, setSavingTo] = useState<string | null>(null);

  // Chapters
  const [chapters, setChapters] = useState<VideoChapter[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Subtitles
  const [subtitles, setSubtitles] = useState<VideoSubtitle[]>([]);

  // Report
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [v, c, r] = await Promise.all([
          videosApi.getOne(id),
          commentsApi.getAll(id),
          videosApi.getRelated(id),
        ]);
        setVideo(v);
        setLikeCount(v.likeCount);
        setComments(c);
        setRelated(r);
        // Load chapters (non-blocking)
        videosApi.getChapters(id).then((ch: VideoChapter[]) => setChapters(ch)).catch(() => {});
        // Load subtitles (non-blocking)
        videosApi.getSubtitles(id).then((s: VideoSubtitle[]) => setSubtitles(s)).catch(() => {});
        // Record watch in history (fire-and-forget — only works if logged in)
        videosApi.recordWatch(id).catch(() => {});
      } catch {
        setError('Video not found');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleLike = async () => {
    if (!isLoggedIn) { router.push('/auth/login'); return; }
    try {
      if (liked) { await likesApi.unlike(id); setLikeCount(c => c - 1); }
      else { await likesApi.like(id); setLikeCount(c => c + 1); }
      setLiked(l => !l);
    } catch { /* ignore */ }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) { router.push('/auth/login'); return; }
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      const newComment = await commentsApi.create(id, commentText.trim());
      setComments(prev => [newComment, ...prev]);
      setCommentText('');
    } catch { setError('Failed to post comment'); }
    finally { setCommentLoading(false); }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await commentsApi.remove(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch { /* ignore */ }
  };

  const openPlaylistMenu = async () => {
    if (!isLoggedIn) { router.push('/auth/login'); return; }
    setShowPlaylistMenu(v => !v);
    if (!playlistsLoaded) {
      const data: Playlist[] = await playlistsApi.getMine().catch(() => []);
      setPlaylists(data);
      setPlaylistsLoaded(true);
    }
  };

  const handleSaveToPlaylist = async (playlistId: string) => {
    setSavingTo(playlistId);
    try {
      await playlistsApi.addVideo(playlistId, id);
    } catch { /* already in playlist — ignore */ }
    finally { setSavingTo(null); setShowPlaylistMenu(false); }
  };

  const seekTo = (seconds: number) => {
    // Works for plain <video> elements; HlsPlayer exposes its own video element
    const el = document.querySelector('video') as HTMLVideoElement | null;
    if (el) { el.currentTime = seconds; el.play().catch(() => {}); }
  };

  const handleReport = async (reason: string) => {
    if (!isLoggedIn) { router.push('/auth/login'); return; }
    setReporting(true);
    try {
      await adminApi.reportVideo(id, reason);
      setReportDone(true);
    } catch { /* already reported or error — ignore */ }
    finally { setReporting(false); setShowReportMenu(false); }
  };

  // Video keyboard shortcuts — only active on this page
  useKeyboardShortcuts({
    onPlayPause: () => {
      const v = document.querySelector('video') as HTMLVideoElement | null;
      if (!v) return;
      v.paused ? v.play().catch(() => {}) : v.pause();
    },
    onSeekBack: () => {
      const v = document.querySelector('video') as HTMLVideoElement | null;
      if (v) v.currentTime = Math.max(0, v.currentTime - 10);
    },
    onSeekForward: () => {
      const v = document.querySelector('video') as HTMLVideoElement | null;
      if (v) v.currentTime = Math.min(v.duration || Infinity, v.currentTime + 10);
    },
    onMute: () => {
      const v = document.querySelector('video') as HTMLVideoElement | null;
      if (v) v.muted = !v.muted;
    },
    onFullscreen: () => {
      const v = document.querySelector('video') as HTMLVideoElement | null;
      if (!v) return;
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        v.requestFullscreen().catch(() => {});
      }
    },
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-400">Loading...</div></div>;

  if (error || !video) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 mb-4">{error || 'Video not found'}</p>
        <Link href="/" className="text-blue-600 hover:underline">← Back to home</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

          {/* ── Video + info (2 cols) ── */}
          <div className="xl:col-span-2 space-y-4">
            <div className="bg-black rounded-xl overflow-hidden aspect-video">
              {video.status === 'PROCESSING' ? (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <div className="text-center"><div className="text-3xl mb-2">⏳</div><p className="text-sm">Processing...</p></div>
                </div>
              ) : video.hlsUrl ? (
                <HlsPlayer
                  hlsUrl={`${API_URL}/${video.hlsUrl}`}
                  fallbackUrl={video.filePath ? `${API_URL}/${video.filePath}` : undefined}
                  poster={video.thumbnailUrl ? `${API_URL}/${video.thumbnailUrl}` : undefined}
                  subtitles={subtitles}
                  className="rounded-xl aspect-video"
                />
              ) : video.filePath ? (
                <video src={`${API_URL}/${video.filePath}`} controls className="w-full h-full" preload="metadata">
                  {subtitles.map((sub, i) => (
                    <track key={sub.id} kind="subtitles" src={`${API_URL}/${sub.filePath}`}
                      srcLang={sub.language} label={sub.label} default={i === 0} />
                  ))}
                </video>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400"><span className="text-4xl">🎬</span></div>
              )}
            </div>

            <div className="bg-white rounded-xl p-4">
              <h1 className="text-xl font-bold text-gray-900 mb-1">{video.title}</h1>
              {video.description && <p className="text-gray-600 text-sm mb-3">{video.description}</p>}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <Link href={`/profile/${video.user.id}`} className="text-sm text-blue-600 hover:underline font-medium">{video.user.name}</Link>
                  <span className="text-xs text-gray-400">{video.viewCount.toLocaleString()} views</span>
                  <span className="text-xs text-gray-400">{new Date(video.createdAt).toLocaleDateString()}</span>
                </div>
                <button onClick={handleLike} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${liked ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500'}`}>
                  {liked ? '❤️' : '🤍'} {likeCount}
                </button>                {/* Save to playlist */}
                <div className="relative">
                  <button onClick={openPlaylistMenu}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                    📋 Save
                  </button>                  {showPlaylistMenu && (
                    <div className="absolute right-0 top-10 z-20 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[200px] py-2">
                      {playlists.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-400 text-center">
                          No playlists yet.{' '}
                          <Link href="/playlists" className="text-blue-600 hover:underline">Create one</Link>
                        </div>
                      ) : (
                        playlists.map(pl => (
                          <button key={pl.id} onClick={() => handleSaveToPlaylist(pl.id)}
                            disabled={savingTo === pl.id}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                            {savingTo === pl.id ? 'Saving...' : pl.title}
                          </button>
                        ))
                      )}
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <Link href="/playlists" className="block px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors">
                          + New playlist
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Report button */}
                <div className="relative ml-auto">
                  {reportDone ? (
                    <span className="text-xs text-green-600 font-medium">✓ Reported</span>
                  ) : (
                    <button onClick={() => setShowReportMenu(v => !v)}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50">
                      ⚑ Report
                    </button>
                  )}
                  {showReportMenu && (
                    <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[180px] py-2">
                      <p className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Report reason</p>
                      {['SPAM', 'HARASSMENT', 'MISINFORMATION', 'INAPPROPRIATE_CONTENT', 'COPYRIGHT', 'OTHER'].map(r => (
                        <button key={r} onClick={() => handleReport(r)} disabled={reporting}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors capitalize">
                          {r.replace(/_/g, ' ').toLowerCase()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Chapters panel */}
            {chapters.length > 0 && (
              <div className="bg-white rounded-xl p-4">
                <h2 className="font-semibold text-gray-900 mb-3">Chapters</h2>
                <div className="space-y-1">
                  {chapters.map(ch => (
                    <button
                      key={ch.id}
                      onClick={() => seekTo(ch.startTime)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-left transition-colors group"
                    >
                      <span className="text-xs font-mono text-blue-600 w-10 flex-shrink-0">
                        {formatDuration(ch.startTime)}
                      </span>
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">{ch.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Subtitles panel */}
            {subtitles.length > 0 && (
              <div className="bg-white rounded-xl p-4">
                <h2 className="font-semibold text-gray-900 mb-3">Subtitles / CC</h2>
                <div className="flex flex-wrap gap-2">
                  {subtitles.map(sub => (
                    <span key={sub.id}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                      🗣 {sub.label}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">Enable captions in the video player controls (CC button)</p>
              </div>
            )}
          </div>

          {/* ── Comments (1 col) ── */}
          <div className="bg-white rounded-xl p-4 flex flex-col h-fit max-h-[600px]">
            <h2 className="font-semibold text-gray-900 mb-3">Comments ({video.commentCount})</h2>
            <form onSubmit={handleComment} className="mb-4">
              <div className="flex gap-2">
                <input ref={commentInputRef} type="text" value={commentText} onChange={e => setCommentText(e.target.value)}
                  placeholder={isLoggedIn ? 'Add a comment...' : 'Login to comment'}
                  disabled={!isLoggedIn || commentLoading} maxLength={500}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50" />
                <button type="submit" disabled={!isLoggedIn || commentLoading || !commentText.trim()}
                  className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">Post</button>
              </div>
            </form>
            <div className="overflow-y-auto space-y-3 flex-1">
              {comments.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">No comments yet</p> : comments.map(comment => (
                <div key={comment.id} className="flex gap-2 group">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Link href={`/profile/${comment.user.id}`} className="text-xs font-semibold text-gray-800 hover:text-blue-600">{comment.user.name}</Link>
                      <span className="text-xs text-gray-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.content}</p>
                  </div>
                  {isLoggedIn && <button onClick={() => handleDeleteComment(comment.id)} className="text-gray-300 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">✕</button>}
                </div>
              ))}
            </div>
          </div>

          {/* ── Related Videos (1 col) ── */}
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-900">Related Videos</h2>
            {related.length === 0 ? (
              <p className="text-sm text-gray-400">No related videos</p>
            ) : related.map(r => (
              <Link key={r.id} href={`/videos/${r.id}`} className="flex gap-3 group hover:bg-white rounded-lg p-2 transition-colors">
                <div className="relative w-28 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-900">
                  {r.thumbnailUrl ? (
                    <Image src={`${API_URL}/${r.thumbnailUrl}`} alt={r.title} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center"><span className="text-xl opacity-60">🎥</span></div>
                  )}
                  {r.duration && <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">{formatDuration(r.duration)}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">{r.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{r.user.name}</p>
                  <p className="text-xs text-gray-400">{r.viewCount.toLocaleString()} views</p>
                </div>
              </Link>
            ))}
          </div>

        </div>
      </main>
    </div>
  );
}

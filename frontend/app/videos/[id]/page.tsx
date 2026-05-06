'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  videosApi, likesApi, commentsApi, playlistsApi, adminApi, usersApi,
  type Video, type Comment, type Playlist, type VideoChapter, type VideoSubtitle,
} from '@/lib/api';
import HlsPlayer from '@/components/HlsPlayer';
import VideoThumbnail from '@/components/VideoThumbnail';
import CommentThread from '@/components/CommentThread';
import SubscribeButton from '@/components/SubscribeButton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useSwipe } from '@/hooks/useSwipe';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function formatDuration(s?: number) {
  if (!s) return '';
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function formatViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'today';
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  return `${Math.floor(months / 12)} year${Math.floor(months / 12) !== 1 ? 's' : ''} ago`;
}

export default function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn } = useAuth();

  const [video, setVideo] = useState<Video | null>(null);
  const [related, setRelated] = useState<Video[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentSort, setCommentSort] = useState<'top' | 'newest'>('top');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [disliked, setDisliked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showDesc, setShowDesc] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistsLoaded, setPlaylistsLoaded] = useState(false);
  const [savingTo, setSavingTo] = useState<string | null>(null);

  const [chapters, setChapters] = useState<VideoChapter[]>([]);
  const [subtitles, setSubtitles] = useState<VideoSubtitle[]>([]);
  const [initialTime, setInitialTime] = useState(0);
  const progressSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Transcript state
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcriptCues, setTranscriptCues] = useState<Array<{ start: number; end: number; text: string }>>([]);
  const [transcriptLoading, setTranscriptLoading] = useState(false);

  const [showReportMenu, setShowReportMenu] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareWithTimestamp, setShareWithTimestamp] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [notInterested, setNotInterested] = useState(false);

  // Playlist queue — populated when ?playlist=<id> is in the URL
  const playlistId = searchParams.get('playlist');
  const [playlistQueue, setPlaylistQueue] = useState<Playlist | null>(null);

  // End screen — shown in last 20s and on video end
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);

  // Autoplay next video
  const [autoplayCountdown, setAutoplayCountdown] = useState<number | null>(null);
  const autoplayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Miniplayer — shown when main player scrolls out of view
  const [showMiniplayer, setShowMiniplayer] = useState(false);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Swipe left on player to go to next related video (mobile)
  useSwipe(playerContainerRef, {
    onSwipeLeft: () => {
      if (related.length > 0) router.push(`/videos/${related[0].id}`);
    },
    threshold: 80,
  });

  const handleShare = () => {
    setShowShareModal(true);
  };

  const copyShareLink = () => {
    const baseUrl = window.location.href.split('?')[0];
    const url = shareWithTimestamp && currentTime > 0 
      ? `${baseUrl}?t=${Math.floor(currentTime)}` 
      : baseUrl;
    
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowShareModal(false);
      }, 1500);
    }).catch(() => {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowShareModal(false);
      }, 1500);
    });
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistTitle.trim()) return;
    setCreatingPlaylist(true);
    try {
      const newPlaylist = await playlistsApi.create({ title: newPlaylistTitle.trim(), isPublic: true });
      await playlistsApi.addVideo(newPlaylist.id, id);
      setPlaylists(prev => [newPlaylist, ...prev]);
      setNewPlaylistTitle('');
      setShowCreatePlaylist(false);
      setShowPlaylistMenu(false);
    } catch { /* ignore */ }
    finally { setCreatingPlaylist(false); }
  };

  const handleNotInterested = () => {
    setNotInterested(true);
    // In a real app, this would send feedback to the recommendation algorithm
    setTimeout(() => {
      router.push('/');
    }, 1500);
  };

  useEffect(() => {
    setLoading(true);
    setVideo(null);
    setComments([]);
    setRelated([]);
    setChapters([]);
    setSubtitles([]);
    setLiked(false);
    setShowEndScreen(false);
    setVideoDuration(0);
    setShowDesc(false);

    Promise.all([
      videosApi.getOne(id),
      commentsApi.getAll(id, undefined, commentSort),
      videosApi.getRelated(id),
    ]).then(([v, c, r]) => {
      setVideo(v);
      setLikeCount(v.likeCount);
      setComments(c);
      setRelated(r);
      // Load like state for logged-in users (non-blocking)
      if (isLoggedIn) {
        usersApi.getMe().then((user: any) => setCurrentUserId(user.id)).catch(() => {});
        likesApi.isLiked(id).then((res: { liked: boolean }) => setLiked(res.liked)).catch(() => {});
        likesApi.isDisliked(id).then((res: { disliked: boolean }) => setDisliked(res.disliked)).catch(() => {});
        // Load watch progress to resume where left off
        // ?t= param from share links takes priority over saved progress
        const tParam = searchParams.get('t');
        if (tParam) {
          setInitialTime(parseInt(tParam, 10));
        } else {
          videosApi.getProgress(id).then((res: { progress: number }) => {
            if (res.progress > 10) setInitialTime(res.progress);
          }).catch(() => {});
        }
      }
      videosApi.getChapters(id).then((ch: VideoChapter[]) => setChapters(ch)).catch(() => {});
      videosApi.getSubtitles(id).then((s: VideoSubtitle[]) => setSubtitles(s)).catch(() => {});
    }).catch(() => setError('Video not found'))
      .finally(() => setLoading(false));
  }, [id, isLoggedIn, commentSort, searchParams]);

  const handleLike = async () => {
    if (!isLoggedIn) { router.push('/auth/login'); return; }
    try {
      if (liked) { await likesApi.unlike(id); setLikeCount(c => c - 1); }
      else { await likesApi.like(id); setLikeCount(c => c + 1); if (disliked) setDisliked(false); }
      setLiked(l => !l);
    } catch { /* ignore */ }
  };

  const handleDislike = async () => {
    if (!isLoggedIn) { router.push('/auth/login'); return; }
    try {
      if (disliked) { await likesApi.undislike(id); }
      else { await likesApi.dislike(id); if (liked) { setLiked(false); setLikeCount(c => c - 1); } }
      setDisliked(d => !d);
    } catch { /* ignore */ }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) { router.push('/auth/login'); return; }
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      const newComment = await commentsApi.create(id, commentText.trim());
      // Refresh full list to get consistent data from server
      const updated = await commentsApi.getAll(id, undefined, commentSort);
      setComments(updated);
      setCommentText('');
    } catch (err: any) {
      alert(err?.message || 'Failed to post comment. Please try again.');
    } finally { setCommentLoading(false); }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await commentsApi.remove(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch { /* ignore */ }
  };

  const handleReplyComment = async (commentId: string, content: string) => {
    try {
      const newReply = await commentsApi.reply(commentId, content);
      // Refresh comments to show the new reply
      const updated = await commentsApi.getAll(id, undefined, commentSort);
      setComments(updated);
    } catch { /* ignore */ }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      await commentsApi.like(commentId);
      // Update like count locally
      setComments(prev => prev.map(c => 
        c.id === commentId ? { ...c, likeCount: c.likeCount + 1 } : c
      ));
    } catch { /* ignore */ }
  };

  const handleUnlikeComment = async (commentId: string) => {
    try {
      await commentsApi.unlike(commentId);
      // Update like count locally
      setComments(prev => prev.map(c => 
        c.id === commentId ? { ...c, likeCount: Math.max(0, c.likeCount - 1) } : c
      ));
    } catch { /* ignore */ }
  };

  const handlePinComment = async (commentId: string) => {
    try {
      await commentsApi.pin(commentId);
      // Refresh comments to show updated pin status
      const updated = await commentsApi.getAll(id, undefined, commentSort);
      setComments(updated);
    } catch { /* ignore */ }
  };

  const handleHeartComment = async (commentId: string) => {
    try {
      await commentsApi.heart(commentId);
      // Refresh comments to show updated heart status
      const updated = await commentsApi.getAll(id, undefined, commentSort);
      setComments(updated);
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
    try { await playlistsApi.addVideo(playlistId, id); }
    catch { /* ignore */ }
    finally { setSavingTo(null); setShowPlaylistMenu(false); }
  };

  const seekTo = (seconds: number) => {
    const el = document.querySelector('video') as HTMLVideoElement | null;
    if (el) { el.currentTime = seconds; el.play().catch(() => {}); }
  };

  // Save progress every 5 seconds while watching
  const handleTimeUpdate = (currentTime: number) => {
    setCurrentTime(currentTime);

    // Capture duration from the video element if not yet set
    if (!videoDuration) {
      const el = document.querySelector('video') as HTMLVideoElement | null;
      if (el?.duration && isFinite(el.duration)) setVideoDuration(el.duration);
    }

    // Show end screen in the last 20 seconds
    const dur = videoDuration || (document.querySelector('video') as HTMLVideoElement | null)?.duration || 0;
    if (dur > 30 && currentTime >= dur - 20) {
      setShowEndScreen(true);
    } else {
      setShowEndScreen(false);
    }

    if (!isLoggedIn) return;
    if (progressSaveTimerRef.current) clearTimeout(progressSaveTimerRef.current);
    progressSaveTimerRef.current = setTimeout(() => {
      videosApi.recordWatch(id, Math.floor(currentTime)).catch(() => {});
    }, 5000);
  };

  // Clean up progress save timer
  useEffect(() => {
    return () => {
      if (progressSaveTimerRef.current) clearTimeout(progressSaveTimerRef.current);
    };
  }, [id]);

  const handleReport = async (reason: string) => {
    if (!isLoggedIn) { router.push('/auth/login'); return; }
    setReporting(true);
    try { await adminApi.reportVideo(id, reason); setReportDone(true); }
    catch { /* ignore */ }
    finally { setReporting(false); setShowReportMenu(false); }
  };

  // Load playlist queue when ?playlist= param is present
  useEffect(() => {
    if (!playlistId) { setPlaylistQueue(null); return; }
    playlistsApi.getOne(playlistId).then(setPlaylistQueue).catch(() => {});
  }, [playlistId]);

  // Autoplay: start countdown when video ends, navigate to next playlist video or first related
  const startAutoplay = () => {
    // Find next video in playlist queue if active
    let nextVideoId: string | null = null;
    if (playlistQueue?.videos) {
      const items = playlistQueue.videos.sort((a, b) => a.position - b.position);
      const currentIdx = items.findIndex(item => item.video.id === id);
      if (currentIdx !== -1 && currentIdx < items.length - 1) {
        nextVideoId = items[currentIdx + 1].video.id;
      }
    }
    if (!nextVideoId && related.length > 0) nextVideoId = related[0].id;
    if (!nextVideoId) return;

    setAutoplayCountdown(5);
    autoplayTimerRef.current = setInterval(() => {
      setAutoplayCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(autoplayTimerRef.current!);
          const dest = nextVideoId + (playlistId ? `?playlist=${playlistId}` : '');
          router.push(`/videos/${dest}`);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelAutoplay = () => {
    if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    setAutoplayCountdown(null);
  };

  // Parse a VTT file into cue objects
  const parseVtt = (vttText: string) => {
    const cues: Array<{ start: number; end: number; text: string }> = [];
    const timeToSec = (t: string) => {
      const parts = t.trim().split(':').map(Number);
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      return parts[0] * 60 + parts[1];
    };
    const blocks = vttText.split(/\n\n+/);
    for (const block of blocks) {
      const lines = block.trim().split('\n');
      const timeLine = lines.find(l => l.includes('-->'));
      if (!timeLine) continue;
      const [startStr, endStr] = timeLine.split('-->');
      const text = lines
        .slice(lines.indexOf(timeLine) + 1)
        .join(' ')
        .replace(/<[^>]+>/g, '') // strip VTT tags
        .trim();
      if (text) cues.push({ start: timeToSec(startStr), end: timeToSec(endStr), text });
    }
    return cues;
  };

  const handleToggleTranscript = async () => {
    if (showTranscript) { setShowTranscript(false); return; }
    setShowTranscript(true);
    if (transcriptCues.length > 0 || transcriptLoading) return;
    // Use the first subtitle track
    const sub = subtitles[0];
    if (!sub) return;
    setTranscriptLoading(true);
    try {
      const res = await fetch(`${API_URL}/${sub.filePath}`);
      const text = await res.text();
      setTranscriptCues(parseVtt(text));
    } catch { /* ignore */ }
    finally { setTranscriptLoading(false); }
  };

  // Clean up timer on unmount or video change
  useEffect(() => {
    return () => { if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current); };
  }, [id]);

  // Miniplayer: show when player scrolls out of view
  useEffect(() => {
    const container = playerContainerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowMiniplayer(!entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [video]); // re-attach after video loads

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
      document.fullscreenElement
        ? document.exitFullscreen().catch(() => {})
        : v.requestFullscreen().catch(() => {});
    },
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !video) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 mb-4">{error || 'Video not found'}</p>
        <Link href="/" className="text-blue-600 hover:underline">← Back to home</Link>
      </div>
    </div>
  );

  // ── Shorts layout — YouTube Shorts style ──────────────────────────────────
  if (video.isShort) {
    const videoSrc = video.hlsUrl
      ? `${API_URL}/${video.hlsUrl}`
      : video.filePath ? `${API_URL}/${video.filePath}` : null;

    return (
      <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
        {/* Back button */}
        <button onClick={() => router.back()}
          className="absolute top-4 left-20 z-50 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Center: portrait video */}
        <div className="flex items-center gap-4 h-full py-4">
          <div className="relative flex-shrink-0" style={{ height: 'calc(100vh - 80px)', aspectRatio: '9/16', maxHeight: '720px' }}>
            {videoSrc ? (
              <video
                src={videoSrc}
                autoPlay
                loop
                playsInline
                controls
                className="w-full h-full rounded-2xl object-cover bg-black"
                onTimeUpdate={(e) => handleTimeUpdate(e.currentTarget.currentTime)}
              />
            ) : (
              <div className="w-full h-full rounded-2xl bg-gray-900 flex items-center justify-center text-gray-400 text-4xl">🎬</div>
            )}

            {/* Bottom overlay: channel + title */}
            <div className="absolute bottom-14 left-0 right-0 px-4 pb-2 bg-gradient-to-t from-black/70 to-transparent rounded-b-2xl pointer-events-none">
              <Link href={`/profile/${video.user.id}`} className="text-white text-sm font-bold pointer-events-auto hover:underline block">
                @{video.user.name}
              </Link>
              <p className="text-white/90 text-sm mt-0.5 line-clamp-2">{video.title}</p>
              {video.description && (
                <p className="text-white/60 text-xs mt-0.5 line-clamp-1">{video.description}</p>
              )}
            </div>
          </div>

          {/* Right side: action buttons */}
          <div className="flex flex-col items-center gap-6 flex-shrink-0 pb-8">
            {/* Channel avatar */}
            <div className="flex flex-col items-center gap-1">
              <Link href={`/profile/${video.user.id}`}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg border-2 border-white shadow-lg">
                {video.user.name.charAt(0).toUpperCase()}
              </Link>
            </div>

            {/* Like */}
            <button onClick={handleLike} className="flex flex-col items-center gap-1.5">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                liked ? 'bg-red-500 text-white' : 'bg-white/15 text-white hover:bg-white/25'
              }`}>
                <svg className="w-6 h-6" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
              </div>
              <span className="text-white text-xs font-semibold">{likeCount > 0 ? likeCount.toLocaleString() : 'Like'}</span>
            </button>

            {/* Dislike */}
            <button onClick={handleDislike} className="flex flex-col items-center gap-1.5">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                disliked ? 'bg-gray-500 text-white' : 'bg-white/15 text-white hover:bg-white/25'
              }`}>
                <svg className="w-6 h-6" fill={disliked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                </svg>
              </div>
              <span className="text-white text-xs font-semibold">Dislike</span>
            </button>

            {/* Comments */}
            <button className="flex flex-col items-center gap-1.5">
              <div className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white shadow-lg transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <span className="text-white text-xs font-semibold">{video.commentCount}</span>
            </button>

            {/* Share */}
            <button onClick={handleShare} className="flex flex-col items-center gap-1.5">
              <div className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white shadow-lg transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <span className="text-white text-xs font-semibold">Share</span>
            </button>

            {/* Subscribe (if not own video) */}
            {currentUserId !== video.user.id && (
              <div className="flex flex-col items-center gap-1.5">
                <SubscribeButton userId={video.user.id} size="sm" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <div className="max-w-[1800px] mx-auto px-4 py-4 flex gap-6">

        {/* ── LEFT: video + info + comments ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Player */}
          <div ref={playerContainerRef} className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
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
                chapters={chapters}
                initialTime={initialTime}
                className="w-full h-full"
                onTimeUpdate={handleTimeUpdate}
                onEnded={startAutoplay}
              />
            ) : video.filePath ? (
              <video src={`${API_URL}/${video.filePath}`} controls className="w-full h-full" preload="metadata"
                ref={(el) => { if (el && initialTime > 0) { el.currentTime = initialTime; } }}
                onEnded={startAutoplay}>
                {subtitles.map((sub, i) => (
                  <track key={sub.id} kind="subtitles" src={`${API_URL}/${sub.filePath}`}
                    srcLang={sub.language} label={sub.label} default={i === 0} />
                ))}
              </video>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <span className="text-4xl">🎬</span>
              </div>
            )}

            {/* End screen — shown in last 20 seconds */}
            {showEndScreen && autoplayCountdown === null && (related.length > 0 || playlistQueue?.videos) && (() => {
              // Determine next video
              let nextVideo: { id: string; title: string; thumbnailUrl?: string; duration?: number; user: { id: string; name: string } } | null = null;
              if (playlistQueue?.videos) {
                const items = playlistQueue.videos.sort((a, b) => a.position - b.position);
                const idx = items.findIndex(item => item.video.id === id);
                if (idx !== -1 && idx < items.length - 1) nextVideo = items[idx + 1].video as unknown as typeof nextVideo;
              }
              if (!nextVideo && related.length > 0) nextVideo = related[0];
              if (!nextVideo) return null;
              const nextDest = `/videos/${nextVideo.id}${playlistId ? `?playlist=${playlistId}` : ''}`;
              return (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Next video card — bottom right */}
                  <div className="absolute bottom-16 right-4 pointer-events-auto">
                    <p className="text-white text-xs font-medium mb-1.5 opacity-80">Up next</p>
                    <Link href={nextDest}
                      className="flex gap-2 bg-black/80 hover:bg-black/90 rounded-xl p-2 transition-colors w-56 group">
                      <div className="relative w-20 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800">
                        {nextVideo.thumbnailUrl ? (
                          <img src={`${API_URL}/${nextVideo.thumbnailUrl}`} alt={nextVideo.title}
                            className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 text-lg">🎬</div>
                        )}
                        {nextVideo.duration && (
                          <span className="absolute bottom-0.5 right-0.5 bg-black/90 text-white text-[9px] px-1 rounded font-medium">
                            {formatDuration(nextVideo.duration)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-semibold line-clamp-2 leading-snug group-hover:text-blue-300 transition-colors">
                          {nextVideo.title}
                        </p>
                        <p className="text-gray-400 text-[10px] mt-0.5 truncate">{nextVideo.user.name}</p>
                      </div>
                    </Link>
                  </div>

                  {/* Subscribe card — bottom left */}
                  {video && currentUserId !== video.user.id && (
                    <div className="absolute bottom-16 left-4 pointer-events-auto">
                      <div className="bg-black/80 rounded-xl p-3 flex flex-col items-center gap-2 w-36">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                          {video.user.name.charAt(0).toUpperCase()}
                        </div>
                        <p className="text-white text-xs font-medium text-center truncate w-full">{video.user.name}</p>
                        <SubscribeButton userId={video.user.id} size="sm" />
                      </div>
                    </div>
                  )}

                  {/* Watch again — center */}
                  <div className="absolute bottom-16 left-1/2 -translate-x-1/2 pointer-events-auto">
                    <button
                      onClick={() => {
                        const el = document.querySelector('video') as HTMLVideoElement | null;
                        if (el) { el.currentTime = 0; el.play().catch(() => {}); }
                        setShowEndScreen(false);
                      }}
                      className="bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-4 py-2 rounded-full backdrop-blur-sm transition-colors flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                      </svg>
                      Watch again
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Autoplay countdown overlay */}
            {autoplayCountdown !== null && (related.length > 0 || playlistQueue?.videos) && (() => {
              // Determine next video for display
              let nextVideo: { id: string; title: string } | null = null;
              if (playlistQueue?.videos) {
                const items = playlistQueue.videos.sort((a, b) => a.position - b.position);
                const idx = items.findIndex(item => item.video.id === id);
                if (idx !== -1 && idx < items.length - 1) nextVideo = items[idx + 1].video;
              }
              if (!nextVideo && related.length > 0) nextVideo = related[0];
              if (!nextVideo) return null;
              const nextDest = `/videos/${nextVideo.id}${playlistId ? `?playlist=${playlistId}` : ''}`;
              return (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-xl">
                  <div className="text-center text-white max-w-xs px-4">
                    <p className="text-sm text-gray-300 mb-2">Up next</p>
                    <p className="font-semibold text-base line-clamp-2 mb-4">{nextVideo.title}</p>
                    <div className="relative w-16 h-16 mx-auto mb-4">
                      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="28" fill="none" stroke="#374151" strokeWidth="4" />
                        <circle cx="32" cy="32" r="28" fill="none" stroke="white" strokeWidth="4"
                          strokeDasharray={`${2 * Math.PI * 28}`}
                          strokeDashoffset={`${2 * Math.PI * 28 * (1 - autoplayCountdown / 5)}`}
                          className="transition-all duration-1000 ease-linear" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xl font-bold">
                        {autoplayCountdown}
                      </span>
                    </div>
                    <div className="flex gap-3 justify-center">
                      <button onClick={cancelAutoplay}
                        className="px-4 py-2 rounded-full border border-white/30 text-sm hover:bg-white/10 transition-colors">
                        Cancel
                      </button>
                      <button onClick={() => { cancelAutoplay(); router.push(nextDest); }}
                        className="px-4 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors">
                        Play now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Title */}
          <h1 className="text-lg font-bold text-gray-900 leading-snug">{video.title}</h1>

          {/* Channel row + action buttons */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Channel info */}
            <div className="flex items-center gap-3">
              <Link href={`/profile/${video.user.id}`}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {video.user.name.charAt(0).toUpperCase()}
              </Link>
              <div>
                <Link href={`/profile/${video.user.id}`}
                  className="text-sm font-semibold text-gray-900 hover:text-blue-600 block">
                  {video.user.name}
                </Link>
                <p className="text-xs text-gray-500">
                  {formatViews(video.viewCount)} views · {timeAgo(video.createdAt)}
                </p>
              </div>
              {/* Don't show subscribe button for own videos */}
              {currentUserId !== video.user.id && (
                <SubscribeButton userId={video.user.id} size="sm" />
              )}
            </div>

            {/* Action buttons — YouTube pill style */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Like + Dislike — YouTube pill style */}
              <div className="flex items-center rounded-full overflow-hidden bg-gray-100">
                <button onClick={handleLike}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-r border-gray-200 ${
                    liked ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-200'
                  }`}>
                  <svg className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                  </svg>
                  {likeCount > 0 ? likeCount.toLocaleString() : 'Like'}
                </button>
                <button onClick={handleDislike}
                  className={`flex items-center px-3 py-2 text-sm font-medium transition-colors ${
                    disliked ? 'bg-gray-700 text-white' : 'text-gray-700 hover:bg-gray-200'
                  }`}
                  title="Dislike">
                  <svg className="w-4 h-4" fill={disliked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                  </svg>
                </button>
              </div>

              {/* Share */}
              <button onClick={handleShare}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                {copied ? 'Copied!' : 'Share'}
              </button>

              {/* Save to playlist */}
              <div className="relative">
                <button onClick={openPlaylistMenu}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Save
                </button>
                {showPlaylistMenu && (
                  <div className="absolute right-0 top-11 z-20 rounded-xl shadow-xl border min-w-[240px] py-2"
                    style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
                    {playlists.length === 0 && !showCreatePlaylist ? (
                      <div className="px-4 py-3 text-sm text-gray-400 text-center">
                        No playlists yet
                      </div>
                    ) : !showCreatePlaylist && playlists.map(pl => (
                      <button key={pl.id} onClick={() => handleSaveToPlaylist(pl.id)}
                        disabled={savingTo === pl.id}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {savingTo === pl.id ? 'Saving...' : pl.title}
                      </button>
                    ))}
                    
                    {showCreatePlaylist ? (
                      <form onSubmit={handleCreatePlaylist} className="px-4 py-3 space-y-3">
                        <input type="text" value={newPlaylistTitle}
                          onChange={e => setNewPlaylistTitle(e.target.value)}
                          placeholder="Playlist name"
                          autoFocus
                          maxLength={100}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { setShowCreatePlaylist(false); setNewPlaylistTitle(''); }}
                            className="flex-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                            Cancel
                          </button>
                          <button type="submit" disabled={creatingPlaylist || !newPlaylistTitle.trim()}
                            className="flex-1 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                            {creatingPlaylist ? 'Creating...' : 'Create'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="border-t mt-1 pt-1" style={{ borderColor: 'var(--border)' }}>
                        <button onClick={() => setShowCreatePlaylist(true)}
                          className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-gray-100 transition-colors flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Create new playlist
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Share / Report */}
              <div className="relative">
                {reportDone ? (
                  <span className="text-xs text-green-600 font-medium px-3 py-2">✓ Reported</span>
                ) : (
                  <button onClick={() => setShowReportMenu(v => !v)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                    </svg>
                  </button>
                )}
                {showReportMenu && (
                  <div className="absolute right-0 top-11 z-20 rounded-xl shadow-xl border min-w-[200px] py-2"
                    style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
                    {/* Not interested */}
                    <button onClick={handleNotInterested} disabled={notInterested}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      {notInterested ? 'Feedback sent' : 'Not interested'}
                    </button>
                    
                    <div className="border-t my-1" style={{ borderColor: 'var(--border)' }} />
                    
                    <p className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Report</p>
                    {['SPAM', 'HARASSMENT', 'MISINFORMATION', 'INAPPROPRIATE_CONTENT', 'COPYRIGHT', 'OTHER'].map(r => (
                      <button key={r} onClick={() => handleReport(r)} disabled={reporting}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors capitalize">
                        {r.replace(/_/g, ' ').toLowerCase()}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description box — collapsible like YouTube */}
          <div className="rounded-xl p-4 cursor-pointer" style={{ background: 'var(--background)' }}
            onClick={() => setShowDesc(v => !v)}>
            <div className={`text-sm text-gray-700 ${showDesc ? '' : 'line-clamp-2'}`}>
              {video.description || <span className="text-gray-400 italic">No description</span>}
            </div>
            {(video.description?.length ?? 0) > 100 && (
              <button className="text-xs font-semibold text-gray-900 mt-1 hover:underline">
                {showDesc ? 'Show less' : 'Show more'}
              </button>
            )}

            {/* Category + Tags */}
            {(video.category || (video.tags && video.tags.length > 0)) && (
              <div className="flex flex-wrap gap-2 mt-3" onClick={e => e.stopPropagation()}>
                {video.category && (
                  <Link href={`/?category=${encodeURIComponent(video.category)}`}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">
                    {video.category}
                  </Link>
                )}
                {video.tags?.map(tag => (
                  <Link key={tag} href={`/search?q=${encodeURIComponent(tag)}`}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Chapters */}
          {chapters.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: 'var(--background)' }}>
              <h2 className="font-semibold text-gray-900 mb-3 text-sm">Chapters</h2>
              <div className="space-y-0.5">
                {chapters.map(ch => (
                  <button key={ch.id} onClick={() => seekTo(ch.startTime)}
                    className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-100 text-left transition-colors group">
                    <span className="text-xs font-mono text-blue-600 w-10 flex-shrink-0">{formatDuration(ch.startTime)}</span>
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">{ch.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Transcript viewer — shown when subtitles are available */}
          {subtitles.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--background)' }}>
              <button
                onClick={handleToggleTranscript}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">Transcript</span>
                  {subtitles[0]?.label && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {subtitles[0].label}
                    </span>
                  )}
                </div>
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform ${showTranscript ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showTranscript && (
                <div className="border-t max-h-72 overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
                  {transcriptLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : transcriptCues.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No transcript available</p>
                  ) : (
                    <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                      {transcriptCues.map((cue, i) => (
                        <button
                          key={i}
                          onClick={() => seekTo(cue.start)}
                          className={`w-full text-left flex gap-3 px-4 py-2 hover:bg-gray-50 transition-colors group ${
                            currentTime >= cue.start && currentTime < cue.end ? 'bg-blue-50' : ''
                          }`}
                        >
                          <span className="text-xs font-mono text-blue-600 flex-shrink-0 pt-0.5 w-10">
                            {formatDuration(Math.floor(cue.start))}
                          </span>
                          <span className={`text-sm leading-relaxed ${
                            currentTime >= cue.start && currentTime < cue.end
                              ? 'text-blue-700 font-medium'
                              : 'text-gray-700 group-hover:text-gray-900'
                          }`}>
                            {cue.text}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Comments */}
          <div className="rounded-xl p-4 space-y-4" style={{ background: 'var(--background)' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">{video.commentCount} Comments</h2>
              
              {/* Sort dropdown */}
              <div className="relative">
                <select value={commentSort} onChange={e => setCommentSort(e.target.value as 'top' | 'newest')}
                  className="text-sm font-medium text-gray-700 bg-transparent border-none cursor-pointer focus:outline-none">
                  <option value="top">Top comments</option>
                  <option value="newest">Newest first</option>
                </select>
              </div>
            </div>

            {/* Comment input */}
            <form onSubmit={handleComment} className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {isLoggedIn ? '👤' : '?'}
              </div>
              <div className="flex-1">
                <input ref={commentInputRef} type="text" value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder={isLoggedIn ? 'Add a comment...' : 'Sign in to comment'}
                  disabled={!isLoggedIn || commentLoading} maxLength={500}
                  className="w-full border-b border-gray-300 bg-transparent pb-1 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50" />
                {commentText && (
                  <div className="flex justify-end gap-2 mt-2">
                    <button type="button" onClick={() => setCommentText('')}
                      className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-full">
                      Cancel
                    </button>
                    <button type="submit" disabled={commentLoading || !commentText.trim()}
                      className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50">
                      Comment
                    </button>
                  </div>
                )}
              </div>
            </form>

            {/* Comment list */}
            <div className="space-y-6">
              {comments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No comments yet. Be the first!</p>
              ) : comments.map(comment => (
                <CommentThread
                  key={comment.id}
                  comment={comment}
                  isVideoOwner={video.user.id === currentUserId}
                  currentUserId={currentUserId || undefined}
                  onReply={handleReplyComment}
                  onDelete={handleDeleteComment}
                  onLike={handleLikeComment}
                  onUnlike={handleUnlikeComment}
                  onPin={handlePinComment}
                  onHeart={handleHeartComment}
                  onSeek={seekTo}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: playlist queue or related videos ── */}
        <div className="hidden lg:block w-[400px] flex-shrink-0 space-y-3">
          {playlistQueue?.videos ? (
            /* Playlist queue panel */
            <div className="rounded-xl overflow-hidden border" style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
              {/* Header */}
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-0.5">
                  <h2 className="font-semibold text-gray-900 text-sm truncate">{playlistQueue.title}</h2>
                  <Link href={`/playlists/${playlistQueue.id}`}
                    className="text-xs text-blue-600 hover:underline flex-shrink-0 ml-2">
                    View all
                  </Link>
                </div>
                {(() => {
                  const items = playlistQueue.videos!.sort((a, b) => a.position - b.position);
                  const idx = items.findIndex(item => item.video.id === id);
                  return (
                    <p className="text-xs text-gray-500">
                      {idx + 1} / {items.length}
                    </p>
                  );
                })()}
              </div>
              {/* Queue items */}
              <div className="overflow-y-auto max-h-[70vh]">
                {playlistQueue.videos
                  .sort((a, b) => a.position - b.position)
                  .map(({ video: qv, position }) => {
                    const isCurrent = qv.id === id;
                    return (
                      <Link
                        key={qv.id}
                        href={`/videos/${qv.id}?playlist=${playlistQueue.id}`}
                        className={`flex gap-2 px-3 py-2 transition-colors ${
                          isCurrent
                            ? 'bg-gray-100'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        {/* Position number */}
                        <span className="text-xs text-gray-400 w-4 flex-shrink-0 mt-1 text-center">
                          {isCurrent ? (
                            <span className="text-blue-600">▶</span>
                          ) : (
                            position + 1
                          )}
                        </span>
                        {/* Thumbnail */}
                        <div className="relative w-28 h-16 flex-shrink-0 rounded overflow-hidden bg-gray-900">
                          <VideoThumbnail
                            thumbnailUrl={qv.thumbnailUrl}
                            filePath={undefined}
                            title={qv.title}
                            className="object-cover"
                          />
                          {qv.duration && (
                            <span className="absolute bottom-1 right-1 bg-black/90 text-white text-[10px] px-1 rounded font-medium">
                              {formatDuration(qv.duration)}
                            </span>
                          )}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold line-clamp-2 leading-snug mb-0.5 ${
                            isCurrent ? 'text-blue-600' : 'text-gray-900'
                          }`}>
                            {qv.title}
                          </p>
                          <p className="text-[11px] text-gray-500 truncate">{qv.user.name}</p>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            </div>
          ) : related.length === 0 ? (
            <p className="text-sm text-gray-400">No related videos</p>
          ) : related.map(r => (
            <Link key={r.id} href={`/videos/${r.id}`}
              className="flex gap-2 group rounded-xl p-1 hover:bg-gray-100 transition-colors">
              {/* Thumbnail */}
              <div className="relative w-40 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-900">
                <VideoThumbnail
                  thumbnailUrl={r.thumbnailUrl}
                  filePath={r.filePath}
                  title={r.title}
                  className="object-cover"
                />
                {r.duration && (
                  <span className="absolute bottom-1 right-1 bg-black/90 text-white text-xs px-1 rounded font-medium">
                    {formatDuration(r.duration)}
                  </span>
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0 py-0.5">
                <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug mb-1">
                  {r.title}
                </p>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0">
                    {r.user.name.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{r.user.name}</p>
                </div>
                <p className="text-xs text-gray-400">
                  {r.viewCount > 0 ? `${formatViews(r.viewCount)} views · ` : ''}
                  {timeAgo(r.createdAt)}
                </p>
                {r.category && (
                  <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
                    {r.category}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>

      </div>

      {/* ── Miniplayer — fixed bottom-right when main player is out of view ── */}
      {showMiniplayer && video && (video.hlsUrl || video.filePath) && (
        <div className="fixed bottom-4 right-4 z-50 w-72 rounded-xl overflow-hidden shadow-2xl border"
          style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
          {/* Mini video */}
          <div className="relative aspect-video bg-black">
            {video.hlsUrl ? (
              <HlsPlayer
                hlsUrl={`${API_URL}/${video.hlsUrl}`}
                fallbackUrl={video.filePath ? `${API_URL}/${video.filePath}` : undefined}
                poster={video.thumbnailUrl ? `${API_URL}/${video.thumbnailUrl}` : undefined}
                className="w-full h-full"
                autoPlay
              />
            ) : video.filePath ? (
              <video src={`${API_URL}/${video.filePath}`} controls autoPlay
                className="w-full h-full" />
            ) : null}

            {/* Close button */}
            <button
              onClick={() => setShowMiniplayer(false)}
              className="absolute top-1 right-1 w-6 h-6 bg-black/70 text-white rounded-full flex items-center justify-center text-xs hover:bg-black transition-colors z-10"
              title="Close miniplayer"
            >
              ✕
            </button>
          </div>

          {/* Mini info — click to scroll back to main player */}
          <button
            onClick={() => {
              setShowMiniplayer(false);
              playerContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="w-full px-3 py-2 text-left hover:bg-gray-100 transition-colors">
            <p className="text-xs font-semibold text-gray-900 line-clamp-1">{video.title}</p>
            <p className="text-xs text-gray-500">{video.user.name}</p>
          </button>
        </div>
      )}

      {/* ── Share Modal ── */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowShareModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--background)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Share</h3>
              <button onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Share link input */}
            <div className="mb-4">
              <div className="flex gap-2">
                <input type="text" readOnly
                  value={shareWithTimestamp && currentTime > 0 
                    ? `${window.location.href.split('?')[0]}?t=${Math.floor(currentTime)}` 
                    : window.location.href.split('?')[0]}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)' }} />
                <button onClick={copyShareLink}
                  className={`px-6 py-3 rounded-lg text-sm font-medium transition-colors ${
                    copied 
                      ? 'bg-green-600 text-white' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}>
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Timestamp checkbox */}
            {currentTime > 0 && (
              <label className="flex items-center gap-2 mb-4 cursor-pointer group">
                <input type="checkbox" checked={shareWithTimestamp}
                  onChange={e => setShareWithTimestamp(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                  Start at {formatDuration(Math.floor(currentTime))}
                </span>
              </label>
            )}

            {/* Social share buttons */}
            <div className="grid grid-cols-4 gap-3">
              <button onClick={() => {
                const url = shareWithTimestamp && currentTime > 0 
                  ? `${window.location.href.split('?')[0]}?t=${Math.floor(currentTime)}` 
                  : window.location.href.split('?')[0];
                window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(video?.title || '')}`, '_blank');
              }}
                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="w-12 h-12 rounded-full bg-blue-400 flex items-center justify-center text-white">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-700">Twitter</span>
              </button>

              <button onClick={() => {
                const url = shareWithTimestamp && currentTime > 0 
                  ? `${window.location.href.split('?')[0]}?t=${Math.floor(currentTime)}` 
                  : window.location.href.split('?')[0];
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
              }}
                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-700">Facebook</span>
              </button>

              <button onClick={() => {
                const url = shareWithTimestamp && currentTime > 0 
                  ? `${window.location.href.split('?')[0]}?t=${Math.floor(currentTime)}` 
                  : window.location.href.split('?')[0];
                window.open(`https://wa.me/?text=${encodeURIComponent(video?.title + ' ' + url)}`, '_blank');
              }}
                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-700">WhatsApp</span>
              </button>

              <button onClick={() => {
                const url = shareWithTimestamp && currentTime > 0 
                  ? `${window.location.href.split('?')[0]}?t=${Math.floor(currentTime)}` 
                  : window.location.href.split('?')[0];
                window.open(`mailto:?subject=${encodeURIComponent(video?.title || '')}&body=${encodeURIComponent(url)}`, '_blank');
              }}
                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-700">Email</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

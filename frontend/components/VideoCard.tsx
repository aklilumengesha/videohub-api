'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { type Video } from '@/lib/api';
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
}

export default function VideoCard({ video, showChannel = true }: VideoCardProps) {
  const duration = formatDuration(video.duration);
  const [showPreview, setShowPreview] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Video source for preview — prefer filePath (direct), skip HLS (too slow to start)
  const previewSrc = video.filePath ? `${API_URL}/${video.filePath}` : null;

  const handleMouseEnter = useCallback(() => {
    if (!previewSrc) return;
    hoverTimerRef.current = setTimeout(() => {
      setShowPreview(true);
      // Small delay to let the video element mount before playing
      setTimeout(() => {
        videoRef.current?.play().catch(() => {});
      }, 50);
    }, 1000); // 1 second hover delay
  }, [previewSrc]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setShowPreview(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, []);

  return (
    <Link href={`/videos/${video.id}`} className="group block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      {/* Thumbnail / Preview */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-900">
        {/* Static thumbnail — always rendered */}
        <div className={`absolute inset-0 transition-opacity duration-300 ${showPreview ? 'opacity-0' : 'opacity-100'}`}>
          <VideoThumbnail
            thumbnailUrl={video.thumbnailUrl}
            filePath={video.filePath}
            title={video.title}
            className="object-cover group-hover:scale-105 transition-transform duration-200"
          />
        </div>

        {/* Muted video preview — fades in on hover */}
        {previewSrc && (
          <video
            ref={videoRef}
            src={previewSrc}
            muted
            loop
            playsInline
            preload="none"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              showPreview ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* Duration badge */}
        {duration && (
          <span className="absolute bottom-1.5 right-1.5 bg-black/90 text-white text-xs font-medium px-1.5 py-0.5 rounded z-10">
            {duration}
          </span>
        )}

        {/* Processing overlay */}
        {video.status === 'PROCESSING' && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl z-10">
            <span className="text-white text-xs font-medium bg-yellow-500 px-2 py-1 rounded">
              Processing...
            </span>
          </div>
        )}
      </div>

      {/* Info — YouTube style: no card, just text below thumbnail */}
      <div className="mt-3 flex gap-3">
        {showChannel && (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0 flex items-center justify-center text-white text-sm font-bold mt-0.5">
            {video.user.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug mb-1">
            {video.title}
          </h3>

          {showChannel && (
            <p className="text-xs text-gray-500 hover:text-gray-700 truncate mb-0.5">
              {video.user.name}
            </p>
          )}

          <p className="text-xs text-gray-500">
            {video.viewCount > 0 ? `${formatViews(video.viewCount)} · ` : ''}
            {timeAgo(video.createdAt)}
          </p>
        </div>
      </div>
    </Link>
  );
}

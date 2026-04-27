'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { type Video } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface VideoCardProps {
  video: Video;
  showChannel?: boolean;
}

/**
 * VideoThumbnailFallback — when no server-generated thumbnail exists,
 * load the video file in a hidden <video> element and capture its first frame
 * onto a canvas to use as a thumbnail image.
 */
function VideoThumbnailFallback({ src, title }: { src: string; title: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleLoadedData = () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL('image/jpeg', 0.8);
      setDataUrl(url);
    } catch {
      setFailed(true);
    }
  };

  if (failed || (!dataUrl && !src)) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center">
        <span className="text-4xl opacity-60">🎥</span>
      </div>
    );
  }

  return (
    <>
      {/* Hidden video to capture first frame */}
      {!dataUrl && (
        <video
          ref={videoRef}
          src={src}
          className="hidden"
          preload="metadata"
          muted
          playsInline
          onLoadedData={handleLoadedData}
          onError={() => setFailed(true)}
        />
      )}
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={dataUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
          <span className="text-2xl opacity-40">⏳</span>
        </div>
      )}
    </>
  );
}

export default function VideoCard({ video, showChannel = true }: VideoCardProps) {
  const thumbnailSrc = video.thumbnailUrl
    ? `${API_URL}/${video.thumbnailUrl}`
    : null;

  // Fallback video source for frame capture
  const videoSrc = video.filePath
    ? `${API_URL}/${video.filePath}`
    : video.hlsUrl
    ? null  // can't capture from HLS easily
    : null;

  const duration = formatDuration(video.duration);

  return (
    <Link
      href={`/videos/${video.id}`}
      className="group flex flex-col bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-video bg-gray-900 overflow-hidden">
        {thumbnailSrc ? (
          <Image
            src={thumbnailSrc}
            alt={video.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized
          />
        ) : videoSrc ? (
          <VideoThumbnailFallback src={videoSrc} title={video.title} />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center">
            <span className="text-4xl opacity-60">🎥</span>
          </div>
        )}

        {/* Duration badge */}
        {duration && (
          <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-xs font-medium px-1.5 py-0.5 rounded">
            {duration}
          </span>
        )}

        {/* Processing overlay */}
        {video.status === 'PROCESSING' && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white text-xs font-medium bg-yellow-500 px-2 py-1 rounded">
              Processing...
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex-1">
        <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm leading-snug mb-1">
          {video.title}
        </h3>

        {showChannel && (
          <p className="text-xs text-gray-500 hover:text-blue-600 truncate mb-1">
            {video.user.name}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-400">
          {video.viewCount > 0 && (
            <span>{video.viewCount.toLocaleString()} views</span>
          )}
          {video.viewCount > 0 && <span>·</span>}
          <span>{new Date(video.createdAt).toLocaleDateString()}</span>
        </div>

        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
          <span>❤️ {video.likeCount}</span>
          <span>💬 {video.commentCount}</span>
        </div>
      </div>
    </Link>
  );
}

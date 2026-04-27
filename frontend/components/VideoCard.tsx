'use client';

import Link from 'next/link';
import { type Video } from '@/lib/api';
import VideoThumbnail from './VideoThumbnail';

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

export default function VideoCard({ video, showChannel = true }: VideoCardProps) {
  const duration = formatDuration(video.duration);

  return (
    <Link
      href={`/videos/${video.id}`}
      className="group flex flex-col bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-video bg-gray-900 overflow-hidden">
        <VideoThumbnail
          thumbnailUrl={video.thumbnailUrl}
          filePath={video.filePath}
          title={video.title}
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {duration && (
          <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-xs font-medium px-1.5 py-0.5 rounded">
            {duration}
          </span>
        )}

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

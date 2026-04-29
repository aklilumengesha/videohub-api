'use client';

/**
 * VideoThumbnail — shows a thumbnail image if available, otherwise captures
 * the first frame of the video file as a fallback (no FFmpeg needed).
 */

import { useState, useRef } from 'react';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface VideoThumbnailProps {
  thumbnailUrl?: string | null;
  filePath?: string | null;
  hlsUrl?: string | null;
  title: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
}

function VideoFrameCapture({ src, title, className }: { src: string; title: string; className?: string }) {
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

  if (failed) {
    return <Placeholder />;
  }

  return (
    <>
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
          className={className || 'w-full h-full object-cover'}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
          <span className="text-xl opacity-40">⏳</span>
        </div>
      )}
    </>
  );
}

function Placeholder() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center">
      <span className="text-3xl opacity-60">🎥</span>
    </div>
  );
}

export default function VideoThumbnail({
  thumbnailUrl,
  filePath,
  title,
  className,
  fill = true,
  width,
  height,
}: VideoThumbnailProps) {
  const thumbSrc = thumbnailUrl ? `${API_URL}/${thumbnailUrl}` : null;
  const videoSrc = filePath ? `${API_URL}/${filePath}` : null;

  if (thumbSrc) {
    return fill ? (
      <Image
        src={thumbSrc}
        alt={title}
        fill
        className={className || 'object-cover'}
        unoptimized
        loading="lazy"
      />
    ) : (
      <Image
        src={thumbSrc}
        alt={title}
        width={width || 320}
        height={height || 180}
        className={className || 'object-cover w-full h-full'}
        unoptimized
        loading="lazy"
      />
    );
  }

  if (videoSrc) {
    return <VideoFrameCapture src={videoSrc} title={title} className={className} />;
  }

  return <Placeholder />;
}

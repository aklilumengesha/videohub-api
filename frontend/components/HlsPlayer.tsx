'use client';

import { useEffect, useRef, useState } from 'react';

interface HlsPlayerProps {
  hlsUrl: string;
  fallbackUrl?: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  subtitles?: Array<{ id: string; language: string; label: string; filePath: string }>;
}

export default function HlsPlayer({
  hlsUrl,
  fallbackUrl,
  poster,
  className = '',
  autoPlay = false,
  onTimeUpdate,
  onEnded,
  subtitles = [],
}: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<import('hls.js').default | null>(null);
  const [quality, setQuality] = useState<string>('auto');
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    let hls: import('hls.js').default | null = null;

    const initPlayer = async () => {
      const Hls = (await import('hls.js')).default;

      if (Hls.isSupported()) {
        hls = new Hls({
          startLevel: -1,        // -1 = auto ABR
          autoStartLoad: true,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
        });

        hlsRef.current = hls;
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          const levels = data.levels.map((l) =>
            l.height ? `${l.height}p` : `${Math.round((l.bitrate ?? 0) / 1000)}k`
          );
          setAvailableQualities(['auto', ...levels]);
          setQuality('auto');

          if (autoPlay) video.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) setError(true);
        });

      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS
        video.src = hlsUrl;
        if (autoPlay) video.play().catch(() => {});
      } else if (fallbackUrl) {
        video.src = fallbackUrl;
      } else {
        setError(true);
      }
    };

    initPlayer();

    return () => {
      hls?.destroy();
      hlsRef.current = null;
    };
  }, [hlsUrl, fallbackUrl, autoPlay]);

  const handleQualityChange = (selectedQuality: string) => {
    const hls = hlsRef.current;
    if (!hls) return;

    setQuality(selectedQuality);

    if (selectedQuality === 'auto') {
      // Re-enable ABR
      hls.currentLevel = -1;
    } else {
      // Find the level index matching the selected quality label
      const idx = hls.levels.findIndex((l) => {
        const label = l.height ? `${l.height}p` : `${Math.round((l.bitrate ?? 0) / 1000)}k`;
        return label === selectedQuality;
      });
      if (idx !== -1) hls.currentLevel = idx;
    }
  };

  const handleTimeUpdate = () => {
    if (onTimeUpdate && videoRef.current) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  };

  if (error) {
    return (
      <div className={`bg-black flex items-center justify-center ${className}`}>
        <div className="text-center text-white">
          <div className="text-3xl mb-2">⚠️</div>
          <p className="text-sm">Video unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-black ${className}`}>
      <video
        ref={videoRef}
        poster={poster}
        controls
        className="w-full h-full"
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onEnded={onEnded}
        playsInline
      >
        {subtitles.map((sub, i) => (
          <track
            key={sub.id}
            kind="subtitles"
            src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/${sub.filePath}`}
            srcLang={sub.language}
            label={sub.label}
            default={i === 0}
          />
        ))}
      </video>

      {/* Quality selector */}
      {availableQualities.length > 1 && (
        <div className="absolute bottom-12 right-3 z-10">
          <select
            value={quality}
            onChange={(e) => handleQualityChange(e.target.value)}
            className="bg-black/80 text-white text-xs px-2 py-1 rounded border border-white/20 cursor-pointer"
          >
            {availableQualities.map((q) => (
              <option key={q} value={q}>
                {q === 'auto' ? '⚙ Auto' : q}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

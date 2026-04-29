'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface HlsPlayerProps {
  hlsUrl: string;
  fallbackUrl?: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  subtitles?: Array<{ id: string; language: string; label: string; filePath: string }>;
  chapters?: Array<{ id: string; title: string; startTime: number }>;
  initialTime?: number;
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
  chapters = [],
  initialTime = 0,
}: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<import('hls.js').default | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [quality, setQuality] = useState<string>('auto');
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [hoveredTime, setHoveredTime] = useState<number | null>(null);

  // Load saved preferences
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedVolume = localStorage.getItem('videoVolume');
    const savedSpeed = localStorage.getItem('videoSpeed');
    if (savedVolume) setVolume(parseFloat(savedVolume));
    if (savedSpeed) setPlaybackRate(parseFloat(savedSpeed));
  }, []);

  // Initialize HLS player
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    let hls: import('hls.js').default | null = null;

    const initPlayer = async () => {
      const Hls = (await import('hls.js')).default;

      if (Hls.isSupported()) {
        hls = new Hls({
          startLevel: -1,
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

          if (initialTime > 0) video.currentTime = initialTime;
          if (autoPlay) video.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) setError(true);
        });

      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = hlsUrl;
        if (initialTime > 0) video.currentTime = initialTime;
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
  }, [hlsUrl, fallbackUrl, autoPlay, initialTime]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video || !containerRef.current) return;

      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'arrowleft':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 5);
          break;
        case 'arrowright':
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 5);
          break;
        case 'j':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case 'l':
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          break;
        case 'arrowup':
          e.preventDefault();
          setVolume(v => Math.min(1, v + 0.1));
          break;
        case 'arrowdown':
          e.preventDefault();
          setVolume(v => Math.max(0, v - 0.1));
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 't':
          e.preventDefault();
          setIsTheaterMode(t => !t);
          break;
        case 'i':
          e.preventDefault();
          togglePictureInPicture();
          break;
        case '0':
        case 'home':
          e.preventDefault();
          video.currentTime = 0;
          break;
        case 'end':
          e.preventDefault();
          video.currentTime = video.duration;
          break;
        case '>':
          e.preventDefault();
          changePlaybackRate(Math.min(2, playbackRate + 0.25));
          break;
        case '<':
          e.preventDefault();
          changePlaybackRate(Math.max(0.25, playbackRate - 0.25));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [playbackRate]);

  // Auto-hide controls
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (isPlaying) {
        controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', () => setShowControls(false));
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', () => setShowControls(false));
      }
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  // Fullscreen change detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Player control functions
  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const togglePictureInPicture = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error('PiP error:', err);
    }
  }, []);

  const changePlaybackRate = useCallback((rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
    localStorage.setItem('videoSpeed', rate.toString());
  }, []);

  const handleQualityChange = (selectedQuality: string) => {
    const hls = hlsRef.current;
    if (!hls) return;

    setQuality(selectedQuality);

    if (selectedQuality === 'auto') {
      hls.currentLevel = -1;
    } else {
      const idx = hls.levels.findIndex((l) => {
        const label = l.height ? `${l.height}p` : `${Math.round((l.bitrate ?? 0) / 1000)}k`;
        return label === selectedQuality;
      });
      if (idx !== -1) hls.currentLevel = idx;
    }
    setShowQualityMenu(false);
  };

  const handleVolumeChange = (newVolume: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    localStorage.setItem('videoVolume', newVolume.toString());
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const progressBar = progressBarRef.current;
    if (!video || !progressBar) return;
    const rect = progressBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
  };

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = progressBarRef.current;
    if (!progressBar || !duration) return;
    const rect = progressBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    setHoveredTime(pos * duration);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    if (onTimeUpdate) onTimeUpdate(video.currentTime);
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    video.volume = volume;
    video.playbackRate = playbackRate;
  };

  const handleProgress = () => {
    const video = videoRef.current;
    if (!video || !video.buffered.length) return;
    const bufferedEnd = video.buffered.end(video.buffered.length - 1);
    setBuffered((bufferedEnd / video.duration) * 100);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getCurrentChapter = () => {
    if (!chapters.length) return null;
    const sorted = [...chapters].sort((a, b) => a.startTime - b.startTime);
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (currentTime >= sorted[i].startTime) return sorted[i];
    }
    return null;
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

  const currentChapter = getCurrentChapter();
  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      ref={containerRef}
      className={`relative bg-black group ${className} ${isTheaterMode ? 'theater-mode' : ''}`}
      onDoubleClick={toggleFullscreen}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full"
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onProgress={handleProgress}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
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

      {/* Custom Controls Overlay */}
      <div 
        className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }}
      >
        {/* Chapter indicator */}
        {currentChapter && (
          <div className="absolute bottom-20 left-4 bg-black/80 px-3 py-1.5 rounded text-white text-sm">
            📖 {currentChapter.title}
          </div>
        )}

        {/* Progress Bar */}
        <div className="px-4 pb-2">
          <div 
            ref={progressBarRef}
            className="relative h-1 bg-white/30 rounded-full cursor-pointer hover:h-1.5 transition-all group/progress"
            onClick={handleProgressClick}
            onMouseMove={handleProgressHover}
            onMouseLeave={() => setHoveredTime(null)}
          >
            {/* Buffered */}
            <div 
              className="absolute h-full bg-white/50 rounded-full"
              style={{ width: `${buffered}%` }}
            />
            {/* Progress */}
            <div 
              className="absolute h-full bg-red-600 rounded-full"
              style={{ width: `${progress}%` }}
            />
            {/* Chapters markers */}
            {chapters.map(chapter => {
              const pos = duration ? (chapter.startTime / duration) * 100 : 0;
              return (
                <div
                  key={chapter.id}
                  className="absolute top-0 w-0.5 h-full bg-white/60"
                  style={{ left: `${pos}%` }}
                  title={chapter.title}
                />
              );
            })}
            {/* Hover time tooltip */}
            {hoveredTime !== null && (
              <div 
                className="absolute bottom-full mb-2 -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap"
                style={{ left: `${(hoveredTime / duration) * 100}%` }}
              >
                {formatTime(hoveredTime)}
              </div>
            )}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between px-4 pb-3 text-white">
          {/* Left controls */}
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button onClick={togglePlayPause} className="hover:scale-110 transition-transform">
              {isPlaying ? (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2 group/volume">
              <button onClick={toggleMute} className="hover:scale-110 transition-transform">
                {isMuted || volume === 0 ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                  </svg>
                ) : volume < 0.5 ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 9v6h4l5 5V4l-5 5H7z"/>
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                  </svg>
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-0 group-hover/volume:w-20 transition-all opacity-0 group-hover/volume:opacity-100"
              />
            </div>

            {/* Time */}
            <div className="text-sm font-medium">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Speed */}
            <div className="relative">
              <button 
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="px-2 py-1 text-sm hover:bg-white/20 rounded transition-colors"
              >
                {playbackRate}x
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-black/95 rounded-lg overflow-hidden shadow-xl">
                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(speed => (
                    <button
                      key={speed}
                      onClick={() => {
                        changePlaybackRate(speed);
                        setShowSpeedMenu(false);
                      }}
                      className={`block w-full px-4 py-2 text-sm text-left hover:bg-white/20 ${
                        playbackRate === speed ? 'bg-white/10' : ''
                      }`}
                    >
                      {speed === 1 ? 'Normal' : `${speed}x`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quality */}
            {availableQualities.length > 1 && (
              <div className="relative">
                <button 
                  onClick={() => setShowQualityMenu(!showQualityMenu)}
                  className="px-2 py-1 text-sm hover:bg-white/20 rounded transition-colors"
                >
                  ⚙ {quality}
                </button>
                {showQualityMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-black/95 rounded-lg overflow-hidden shadow-xl">
                    {availableQualities.map(q => (
                      <button
                        key={q}
                        onClick={() => handleQualityChange(q)}
                        className={`block w-full px-4 py-2 text-sm text-left hover:bg-white/20 ${
                          quality === q ? 'bg-white/10' : ''
                        }`}
                      >
                        {q === 'auto' ? '⚙ Auto' : q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Settings */}
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-white/20 rounded transition-colors"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
              </svg>
            </button>

            {/* Theater Mode */}
            <button 
              onClick={() => setIsTheaterMode(!isTheaterMode)}
              className="p-2 hover:bg-white/20 rounded transition-colors"
              title="Theater mode (t)"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 7H5c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm0 8H5V9h14v6z"/>
              </svg>
            </button>

            {/* Picture-in-Picture */}
            <button 
              onClick={togglePictureInPicture}
              className="p-2 hover:bg-white/20 rounded transition-colors"
              title="Picture-in-picture (i)"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98V5c0-1.1-.9-2-2-2zm0 16.01H3V4.98h18v14.03z"/>
              </svg>
            </button>

            {/* Fullscreen */}
            <button 
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white/20 rounded transition-colors"
              title="Fullscreen (f)"
            >
              {isFullscreen ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Center play button overlay */}
      {!isPlaying && (
        <button
          onClick={togglePlayPause}
          className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
        >
          <div className="w-20 h-20 bg-black/70 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors">
            <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </button>
      )}
    </div>
  );
}

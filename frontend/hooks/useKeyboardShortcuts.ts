import { useEffect, useCallback } from 'react';

interface ShortcutHandlers {
  onSearch?: () => void;       // / — focus search
  onHelp?: () => void;         // ? — show help modal
  onPlayPause?: () => void;    // k — play/pause
  onFullscreen?: () => void;   // f — fullscreen
  onSeekBack?: () => void;     // j — seek -10s
  onSeekForward?: () => void;  // l — seek +10s
  onMute?: () => void;         // m — mute
}

/** Returns true if the user is currently typing in an input/textarea */
function isTyping(): boolean {
  const tag = document.activeElement?.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' ||
    (document.activeElement as HTMLElement)?.isContentEditable === true;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handle = useCallback((e: KeyboardEvent) => {
    // Never fire when user is typing
    if (isTyping()) return;
    // Never fire with modifier keys (except Shift for ?)
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    switch (e.key) {
      case '/':
        e.preventDefault();
        handlers.onSearch?.();
        break;
      case '?':
        handlers.onHelp?.();
        break;
      case 'k':
      case 'K':
        handlers.onPlayPause?.();
        break;
      case 'f':
      case 'F':
        handlers.onFullscreen?.();
        break;
      case 'j':
      case 'J':
        handlers.onSeekBack?.();
        break;
      case 'l':
      case 'L':
        handlers.onSeekForward?.();
        break;
      case 'm':
      case 'M':
        handlers.onMute?.();
        break;
    }
  }, [handlers]);

  useEffect(() => {
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [handle]);
}

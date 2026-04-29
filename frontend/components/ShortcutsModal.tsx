'use client';

import { useEffect } from 'react';

interface ShortcutsModalProps {
  onClose: () => void;
}

const SHORTCUTS = [
  // Navigation
  { keys: ['/'], label: 'Focus search bar', section: 'Navigation' },
  { keys: ['?'], label: 'Show keyboard shortcuts', section: 'Navigation' },
  // Video playback
  { keys: ['k', 'Space'], label: 'Play / Pause', section: 'Playback' },
  { keys: ['j'], label: 'Seek back 10 seconds', section: 'Playback' },
  { keys: ['l'], label: 'Seek forward 10 seconds', section: 'Playback' },
  { keys: ['←'], label: 'Seek back 5 seconds', section: 'Playback' },
  { keys: ['→'], label: 'Seek forward 5 seconds', section: 'Playback' },
  { keys: ['↑'], label: 'Volume up 5%', section: 'Playback' },
  { keys: ['↓'], label: 'Volume down 5%', section: 'Playback' },
  { keys: ['m'], label: 'Toggle mute', section: 'Playback' },
  { keys: ['0–9'], label: 'Seek to 0%–90% of video', section: 'Playback' },
  // View
  { keys: ['f'], label: 'Toggle fullscreen', section: 'View' },
  { keys: ['t'], label: 'Toggle theater mode', section: 'View' },
  { keys: ['i'], label: 'Toggle picture-in-picture', section: 'View' },
  { keys: ['c'], label: 'Toggle captions', section: 'View' },
];

const sections = [...new Set(SHORTCUTS.map(s => s.section))];

export default function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <div className="rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Keyboard Shortcuts</h2>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {sections.map(section => (
          <div key={section}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 pb-1 border-b"
              style={{ borderColor: 'var(--border)' }}>
              {section}
            </p>
            <div className="space-y-2.5">
              {SHORTCUTS.filter(s => s.section === section).map(s => (
                <div key={s.label} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-gray-700">{s.label}</span>
                  <div className="flex gap-1 flex-shrink-0">
                    {s.keys.map((k, i) => (
                      <span key={k} className="flex items-center gap-1">
                        {i > 0 && <span className="text-xs text-gray-400">or</span>}
                        <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded text-xs font-mono font-semibold border shadow-sm"
                          style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                          {k}
                        </kbd>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <p className="text-xs text-gray-400 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
          Shortcuts are disabled while typing in a text field.
        </p>
      </div>
    </div>
  );
}

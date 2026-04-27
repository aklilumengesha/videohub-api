'use client';

import { useEffect } from 'react';

interface ShortcutsModalProps {
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ['/', ], label: 'Focus search bar', section: 'Navigation' },
  { keys: ['?'], label: 'Show keyboard shortcuts', section: 'Navigation' },
  { keys: ['k'], label: 'Play / Pause', section: 'Video' },
  { keys: ['f'], label: 'Toggle fullscreen', section: 'Video' },
  { keys: ['j'], label: 'Seek back 10 seconds', section: 'Video' },
  { keys: ['l'], label: 'Seek forward 10 seconds', section: 'Video' },
  { keys: ['m'], label: 'Toggle mute', section: 'Video' },
];

const sections = [...new Set(SHORTCUTS.map(s => s.section))];

export default function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <div className="rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4"
        style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {sections.map(section => (
          <div key={section}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{section}</p>
            <div className="space-y-2">
              {SHORTCUTS.filter(s => s.section === section).map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{s.label}</span>
                  <div className="flex gap-1">
                    {s.keys.map(k => (
                      <kbd key={k}
                        className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded text-xs font-mono font-semibold border"
                        style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <p className="text-xs text-gray-400 pt-1">Shortcuts are disabled while typing in a text field.</p>
      </div>
    </div>
  );
}

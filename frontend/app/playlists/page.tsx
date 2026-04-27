'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { playlistsApi, type Playlist } from '@/lib/api';

export default function PlaylistsPage() {
  const router = useRouter();
  const { isLoggedIn, loading: authLoading } = useAuth();

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.push('/auth/login');
  }, [isLoggedIn, authLoading, router]);

  useEffect(() => {
    if (!isLoggedIn) return;
    playlistsApi.getMine()
      .then((data: Playlist[]) => setPlaylists(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      const created: Playlist = await playlistsApi.create({ title: title.trim(), description: description.trim() || undefined, isPublic });
      setPlaylists(prev => [created, ...prev]);
      setTitle(''); setDescription(''); setIsPublic(true); setShowForm(false);
    } catch { /* ignore */ }
    finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await playlistsApi.delete(id);
      setPlaylists(prev => prev.filter(p => p.id !== id));
      setDeletingId(null);
    } catch { /* ignore */ }
  };

  if (authLoading || (!isLoggedIn && !authLoading)) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">Playlists</h1>
          <button onClick={() => setShowForm(v => !v)}
            className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-colors">
            {showForm ? 'Cancel' : '+ New Playlist'}
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleCreate} className="rounded-xl p-5 mb-6 border space-y-3"
            style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
            <h2 className="font-semibold text-gray-900">New Playlist</h2>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={100}
              placeholder="Playlist title *" required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={300} rows={2}
              placeholder="Description (optional)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="rounded" />
              Public playlist
            </label>
            <button type="submit" disabled={creating || !title.trim()}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {creating ? 'Creating...' : 'Create Playlist'}
            </button>
          </form>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-gray-200 animate-pulse" />
            ))}
          </div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No playlists yet</h2>
            <p className="text-gray-500">Create a playlist to organise your favourite videos</p>
          </div>
        ) : (
          <div className="space-y-2">
            {playlists.map(pl => (
              <div key={pl.id} className="flex items-center gap-4 rounded-xl px-4 py-3 hover:bg-gray-100 transition-colors group"
                style={{ background: 'var(--background)' }}>
                {/* Playlist icon */}
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl flex-shrink-0">
                  📋
                </div>
                <Link href={`/playlists/${pl.id}`} className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{pl.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {pl._count?.videos ?? 0} videos · {pl.isPublic ? 'Public' : 'Private'}
                  </p>
                </Link>
                <button onClick={() => setDeletingId(pl.id)}
                  className="text-xs text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all px-2 py-1 rounded">
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Delete confirmation */}
        {deletingId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="rounded-xl p-6 max-w-sm w-full shadow-xl" style={{ background: 'var(--background)' }}>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete playlist?</h3>
              <p className="text-gray-500 text-sm mb-4">This will permanently delete the playlist.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingId(null)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button onClick={() => handleDelete(deletingId)}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

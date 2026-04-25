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

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [creating, setCreating] = useState(false);

  // Delete
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
      setTitle('');
      setDescription('');
      setIsPublic(true);
      setShowForm(false);
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
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Playlists</h1>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {showForm ? 'Cancel' : '+ New Playlist'}
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-xl p-5 mb-6 border border-gray-200 space-y-3">
            <h2 className="font-semibold text-gray-900">New Playlist</h2>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Title *</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={100}
                placeholder="My Playlist"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={300}
                rows={2}
                placeholder="Optional description"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="rounded" />
              Public playlist
            </label>
            <button
              type="submit"
              disabled={creating || !title.trim()}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Playlist'}
            </button>
          </form>
        )}

        {/* Playlist list */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">Loading...</div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">📋</div>
            <p className="text-lg font-medium text-gray-600 mb-1">No playlists yet</p>
            <p className="text-sm">Create a playlist to organise your favourite videos</p>
          </div>
        ) : (
          <div className="space-y-3">
            {playlists.map(pl => (
              <div key={pl.id} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center justify-between gap-4">
                <Link href={`/playlists/${pl.id}`} className="flex-1 min-w-0 hover:text-blue-600 transition-colors">
                  <h3 className="font-semibold text-gray-900 truncate">{pl.title}</h3>
                  {pl.description && <p className="text-sm text-gray-500 truncate mt-0.5">{pl.description}</p>}
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>{pl._count?.videos ?? 0} videos</span>
                    <span>{pl.isPublic ? '🌐 Public' : '🔒 Private'}</span>
                  </div>
                </Link>
                <button
                  onClick={() => setDeletingId(pl.id)}
                  className="text-xs text-red-400 hover:text-red-600 flex-shrink-0 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Delete confirmation */}
        {deletingId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete playlist?</h3>
              <p className="text-gray-500 text-sm mb-4">This will permanently delete the playlist and remove all videos from it.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingId(null)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={() => handleDelete(deletingId)}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

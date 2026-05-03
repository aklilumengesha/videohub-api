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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPublic, setEditPublic] = useState(true);
  const [saving, setSaving] = useState(false);

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
      const created: Playlist = await playlistsApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        isPublic,
      });
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

  const openEdit = (pl: Playlist) => {
    setEditingId(pl.id);
    setEditTitle(pl.title);
    setEditDesc(pl.description || '');
    setEditPublic(pl.isPublic);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editTitle.trim()) return;
    setSaving(true);
    try {
      const updated = await playlistsApi.update(editingId, {
        title: editTitle.trim(),
        description: editDesc.trim(),
        isPublic: editPublic,
      });
      setPlaylists(prev => prev.map(p => p.id === editingId ? { ...p, ...updated } : p));
      setEditingId(null);
    } catch { /* ignore */ }
    finally { setSaving(false); }
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
              placeholder="Playlist title *" required autoFocus
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
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--background)' }} />
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
              <div key={pl.id} className="rounded-xl border transition-colors group"
                style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
                {editingId === pl.id ? (
                  <form onSubmit={handleSaveEdit} className="p-4 space-y-3">
                    <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
                      required maxLength={100} autoFocus
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)}
                      rows={2} maxLength={300} placeholder="Description (optional)"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={editPublic} onChange={e => setEditPublic(e.target.checked)} className="rounded" />
                      Public playlist
                    </label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setEditingId(null)}
                        className="flex-1 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        Cancel
                      </button>
                      <button type="submit" disabled={saving || !editTitle.trim()}
                        className="flex-1 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center gap-4 px-4 py-3 hover:bg-gray-100 transition-colors rounded-xl">
                    {/* Playlist icon with video count */}
                    <div className="relative w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl flex-shrink-0">
                      📋
                      {(pl._count?.videos ?? 0) > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-gray-900 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                          {pl._count!.videos}
                        </span>
                      )}
                    </div>
                    <Link href={`/playlists/${pl.id}`} className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{pl.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {pl._count?.videos ?? 0} video{(pl._count?.videos ?? 0) !== 1 ? 's' : ''} · {pl.isPublic ? '🌐 Public' : '🔒 Private'}
                      </p>
                    </Link>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(pl)}
                        className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-200 transition-colors">
                        Edit
                      </button>
                      <button onClick={() => setDeletingId(pl.id)}
                        className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 transition-colors">
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Delete confirmation modal */}
        {deletingId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="rounded-xl p-6 max-w-sm w-full shadow-xl" style={{ background: 'var(--background)' }}>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete playlist?</h3>
              <p className="text-gray-500 text-sm mb-4">
                &quot;{playlists.find(p => p.id === deletingId)?.title}&quot; will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingId(null)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
                  Cancel
                </button>
                <button onClick={() => handleDelete(deletingId)}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

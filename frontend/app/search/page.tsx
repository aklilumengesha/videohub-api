'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { searchApi, type Video, type User } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Tab = 'videos' | 'users';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('videos');
  const [videos, setVideos] = useState<Video[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search — fires 500ms after user stops typing
  useEffect(() => {
    if (query.trim().length < 2) {
      setVideos([]);
      setUsers([]);
      setSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [v, u] = await Promise.all([
          searchApi.videos(query.trim()),
          searchApi.users(query.trim()),
        ]);
        setVideos(v);
        setUsers(u);
        setSearched(true);
      } catch {
        setVideos([]);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const totalResults = videos.length + users.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Search</h1>

        {/* Search input */}
        <div className="relative mb-6">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search videos or users..."
            className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          {loading && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
              Searching...
            </span>
          )}
        </div>

        {/* Tabs — only show when there are results */}
        {searched && (
          <>
            <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setTab('videos')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === 'videos'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Videos ({videos.length})
              </button>
              <button
                onClick={() => setTab('users')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === 'users'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Users ({users.length})
              </button>
            </div>

            {totalResults === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">🔍</div>
                <p>No results for &quot;{query}&quot;</p>
              </div>
            ) : (
              <>
                {/* Videos tab */}
                {tab === 'videos' && (
                  <div className="space-y-3">
                    {videos.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-8">No videos found</p>
                    ) : (
                      videos.map(video => (
                        <Link
                          key={video.id}
                          href={`/videos/${video.id}`}
                          className="flex gap-4 bg-white rounded-xl p-3 hover:shadow-md transition-shadow border border-gray-100"
                        >
                          {/* Thumbnail */}
                          <div className="relative w-32 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-900">
                            {video.thumbnailUrl ? (
                              <Image
                                src={`${API_URL}/${video.thumbnailUrl}`}
                                alt={video.title}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center">
                                <span className="text-2xl opacity-60">🎥</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{video.title}</h3>
                            {video.description && (
                              <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{video.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                              <span className="text-blue-600 font-medium">{video.user.name}</span>
                              <span>❤️ {video.likeCount}</span>
                              <span>💬 {video.commentCount}</span>
                            </div>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                )}

                {/* Users tab */}
                {tab === 'users' && (
                  <div className="space-y-3">
                    {users.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-8">No users found</p>
                    ) : (
                      users.map(user => (
                        <Link
                          key={user.id}
                          href={`/profile/${user.id}`}
                          className="flex items-center gap-4 bg-white rounded-xl p-4 hover:shadow-md transition-shadow border border-gray-100"
                        >
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{user.name}</h3>
                            {user.bio && (
                              <p className="text-sm text-gray-500 line-clamp-1">{user.bio}</p>
                            )}
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Initial state */}
        {!searched && !loading && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">🎬</div>
            <p>Search for videos or creators</p>
          </div>
        )}
      </main>
    </div>
  );
}

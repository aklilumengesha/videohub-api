'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { searchApi, type Video, type User } from '@/lib/api';
import VideoThumbnail from '@/components/VideoThumbnail';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Tab = 'videos' | 'users';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'today';
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  return `${Math.floor(months / 12)} year${Math.floor(months / 12) !== 1 ? 's' : ''} ago`;
}

function formatViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('videos');
  const [videos, setVideos] = useState<Video[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setVideos([]); setUsers([]); setSearched(false); return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [v, u] = await Promise.all([
          searchApi.videos(query.trim()),
          searchApi.users(query.trim()),
        ]);
        setVideos(v); setUsers(u); setSearched(true);
      } catch {
        setVideos([]); setUsers([]);
      } finally { setLoading(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* Search input */}
        <div className="relative mb-6">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search videos or creators..."
            className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            style={{ background: 'var(--background)' }} />
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {searched && (
          <>
            {/* Tabs */}
            <div className="flex gap-1 mb-5 border-b" style={{ borderColor: 'var(--border)' }}>
              {(['videos', 'users'] as Tab[]).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
                    tab === t
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  {t} ({t === 'videos' ? videos.length : users.length})
                </button>
              ))}
            </div>

            {videos.length === 0 && users.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-2">🔍</div>
                <p>No results for &quot;{query}&quot;</p>
              </div>
            ) : (
              <>
                {/* Videos */}
                {tab === 'videos' && (
                  <div className="space-y-4">
                    {videos.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-8">No videos found</p>
                    ) : videos.map(video => (
                      <Link key={video.id} href={`/videos/${video.id}`}
                        className="flex gap-4 group rounded-xl p-1 hover:bg-gray-100 transition-colors">
                        <div className="relative w-40 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-900">
                          <VideoThumbnail
                            thumbnailUrl={video.thumbnailUrl}
                            filePath={video.filePath}
                            title={video.title}
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0 py-0.5">
                          <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm leading-snug mb-1">{video.title}</h3>
                          {video.description && (
                            <p className="text-xs text-gray-500 line-clamp-1 mb-1">{video.description}</p>
                          )}
                          <p className="text-xs text-gray-500">{video.user.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {video.viewCount > 0 ? `${formatViews(video.viewCount)} views · ` : ''}
                            {timeAgo(video.createdAt)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Users */}
                {tab === 'users' && (
                  <div className="space-y-3">
                    {users.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-8">No users found</p>
                    ) : users.map(user => (
                      <Link key={user.id} href={`/profile/${user.id}`}
                        className="flex items-center gap-4 rounded-xl px-4 py-3 hover:bg-gray-100 transition-colors"
                        style={{ background: 'var(--background)' }}>
                        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                          {user.avatarUrl ? (
                            <Image src={`${API_URL}/${user.avatarUrl}`} alt={user.name}
                              width={48} height={48} className="w-full h-full object-cover" unoptimized />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">{user.name}</h3>
                          {user.bio && <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{user.bio}</p>}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {!searched && !loading && (
          <div className="text-center py-24 text-gray-400">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-lg font-medium text-gray-600 mb-1">Search VideoHub</p>
            <p className="text-sm">Find videos and creators</p>
          </div>
        )}
      </div>
    </div>
  );
}

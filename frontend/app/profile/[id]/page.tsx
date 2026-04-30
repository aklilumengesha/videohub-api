'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { usersApi, playlistsApi, type User, type Video, type Playlist } from '@/lib/api';
import VideoCard from '@/components/VideoCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function formatSubscribers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

type Tab = 'videos' | 'playlists' | 'about';

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isLoggedIn } = useAuth();

  const [profile, setProfile] = useState<User | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('videos');

  useEffect(() => {
    Promise.all([
      usersApi.getProfile(id),
      usersApi.getUserVideos(id),
      playlistsApi.getUserPlaylists(id),
    ]).then(([p, v, pl]) => {
      setProfile(p);
      setVideos(v);
      setPlaylists(pl);
      setFollowerCount(p._count?.followers ?? p.subscriberCount ?? 0);
      if (isLoggedIn) {
        usersApi.isFollowing(id)
          .then((r: any) => setFollowing(r.isFollowing ?? r.following ?? false))
          .catch(() => {});
      }
    }).catch(() => setError('User not found'))
      .finally(() => setLoading(false));
  }, [id, isLoggedIn]);

  const handleFollow = async () => {
    if (!isLoggedIn) { router.push('/auth/login'); return; }
    setFollowLoading(true);
    try {
      if (following) {
        await usersApi.unfollow(id);
        setFollowerCount(c => Math.max(0, c - 1));
      } else {
        await usersApi.follow(id);
        setFollowerCount(c => c + 1);
      }
      setFollowing(f => !f);
    } catch { /* ignore */ }
    finally { setFollowLoading(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !profile) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 mb-4">{error || 'User not found'}</p>
        <Link href="/" className="text-blue-600 hover:underline">← Back to home</Link>
      </div>
    </div>
  );

  const TABS: { id: Tab; label: string }[] = [
    { id: 'videos', label: 'Videos' },
    { id: 'playlists', label: 'Playlists' },
    { id: 'about', label: 'About' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      {/* Banner */}
      <div className="h-36 sm:h-48 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500" />

      <div className="max-w-[1200px] mx-auto px-4">
        {/* Channel header */}
        <div className="flex items-end gap-5 -mt-10 mb-0 pb-4" style={{ borderColor: 'var(--border)' }}>
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 flex-shrink-0"
            style={{ borderColor: 'var(--background)', background: 'var(--background)' }}>
            {profile.avatarUrl ? (
              <Image src={`${API_URL}/${profile.avatarUrl}`} alt={profile.name}
                width={96} height={96} className="w-full h-full object-cover" unoptimized />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 pb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{profile.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {formatSubscribers(followerCount)} subscriber{followerCount !== 1 ? 's' : ''} · {videos.length} video{videos.length !== 1 ? 's' : ''}
            </p>
          </div>

          <button onClick={handleFollow} disabled={followLoading}
            className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-colors disabled:opacity-50 ${
              following ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-gray-700'
            }`}>
            {followLoading ? '...' : following ? 'Subscribed' : 'Subscribe'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b mt-2" style={{ borderColor: 'var(--border)' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="py-6 pb-10">
          {activeTab === 'videos' && (
            videos.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <div className="text-5xl mb-3">🎬</div>
                <p className="text-lg font-medium text-gray-600 mb-1">No videos yet</p>
                <p className="text-sm">This channel hasn&apos;t uploaded any videos</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
                {videos.map(video => <VideoCard key={video.id} video={video} showChannel={false} />)}
              </div>
            )
          )}

          {activeTab === 'playlists' && (
            playlists.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <div className="text-5xl mb-3">📋</div>
                <p className="text-lg font-medium text-gray-600 mb-1">No public playlists</p>
                <p className="text-sm">This channel hasn&apos;t created any public playlists</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {playlists.map(pl => (
                  <Link key={pl.id} href={`/playlists/${pl.id}`}
                    className="flex items-center gap-4 rounded-xl px-4 py-3 border transition-colors hover:bg-gray-100"
                    style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl flex-shrink-0">
                      📋
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{pl.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{pl._count?.videos ?? 0} videos</p>
                    </div>
                  </Link>
                ))}
              </div>
            )
          )}

          {activeTab === 'about' && (
            <div className="max-w-xl space-y-4">
              <div className="rounded-xl p-5" style={{ background: 'var(--background)' }}>
                <h2 className="font-semibold text-gray-900 mb-3">About</h2>
                {profile.bio ? (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{profile.bio}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No description provided</p>
                )}
              </div>
              <div className="rounded-xl p-5" style={{ background: 'var(--background)' }}>
                <h2 className="font-semibold text-gray-900 mb-3">Stats</h2>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span>📅</span>
                    <span>Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>👁</span>
                    <span>{videos.reduce((s, v) => s + (v.viewCount ?? 0), 0).toLocaleString()} total views</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🎬</span>
                    <span>{videos.length} video{videos.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

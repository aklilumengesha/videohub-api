'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { usersApi, videosApi, playlistsApi, type Video, type Playlist } from '@/lib/api';
import VideoCard from '@/components/VideoCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Tab = 'home' | 'videos' | 'playlists' | 'about';

export default function ChannelPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  
  const [channel, setChannel] = useState<any>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      usersApi.getProfile(id),
      usersApi.getUserVideos(id),
      playlistsApi.getUserPlaylists(id),
    ]).then(([profile, vids, pls]) => {
      setChannel(profile);
      setVideos(vids);
      setPlaylists(pls);
      if (isLoggedIn) {
        usersApi.isFollowing(id).then((res: any) => setIsSubscribed(res.isFollowing ?? res.following ?? false)).catch(() => {});
      }
    }).catch(() => router.push('/'))
      .finally(() => setLoading(false));
  }, [id, isLoggedIn, router]);

  const handleSubscribe = async () => {
    if (!isLoggedIn) { router.push('/auth/login'); return; }
    setSubscribing(true);
    try {
      if (isSubscribed) {
        await usersApi.unfollow(id);
        setIsSubscribed(false);
        setChannel((c: any) => ({ ...c, subscriberCount: (c.subscriberCount || 1) - 1 }));
      } else {
        await usersApi.follow(id);
        setIsSubscribed(true);
        setChannel((c: any) => ({ ...c, subscriberCount: (c.subscriberCount || 0) + 1 }));
      }
    } catch { /* ignore */ }
    finally { setSubscribing(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!channel) return null;

  const formatCount = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return `${n}`;
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      {/* Channel Banner */}
      <div className="w-full h-32 sm:h-48 bg-gradient-to-r from-blue-500 to-purple-600 relative">
        {channel.bannerUrl && (
          <Image src={`${API_URL}/${channel.bannerUrl}`} alt="Banner" fill className="object-cover" unoptimized />
        )}
      </div>

      {/* Channel Header */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12 sm:-mt-16 mb-6">
          {/* Avatar */}
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white shadow-lg flex-shrink-0">
            {channel.avatarUrl ? (
              <Image src={`${API_URL}/${channel.avatarUrl}`} alt={channel.name} width={128} height={128} 
                className="w-full h-full object-cover" unoptimized />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-4xl">
                {channel.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Channel Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{channel.name}</h1>
              {channel.isVerified && (
                <span title="Verified channel"
                  className="inline-flex items-center justify-center w-6 h-6 bg-blue-600 rounded-full flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-2">
              <span>{formatCount(channel.subscriberCount || 0)} subscribers</span>
              <span>•</span>
              <span>{videos.length} videos</span>
            </div>
            {channel.bio && (
              <p className="text-sm text-gray-600 line-clamp-2">{channel.bio}</p>
            )}
          </div>

          {/* Subscribe Button */}
          <button
            onClick={handleSubscribe}
            disabled={subscribing}
            className={`px-6 py-2.5 rounded-full font-medium text-sm transition-colors disabled:opacity-50 flex-shrink-0 ${
              isSubscribed
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {subscribing ? 'Loading...' : isSubscribed ? 'Subscribed' : 'Subscribe'}
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b mb-6" style={{ borderColor: 'var(--border)' }}>
          <div className="flex gap-6">
            {(['home', 'videos', 'playlists', 'about'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                  activeTab === tab
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="pb-12">
          {activeTab === 'home' && (
            <div className="space-y-8">
              {/* Featured Video */}
              {videos.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Featured</h2>
                  <div className="max-w-2xl">
                    <VideoCard video={videos[0]} />
                  </div>
                </div>
              )}

              {/* Recent Uploads */}
              {videos.length > 1 && (
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Recent uploads</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {videos.slice(1, 5).map(video => (
                      <VideoCard key={video.id} video={video} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'videos' && (
            <div>
              {videos.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <div className="text-4xl mb-2">🎬</div>
                  <p>No videos yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {videos.map(video => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'playlists' && (
            playlists.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-2">📋</div>
                <p>No public playlists</p>
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
            <div className="max-w-2xl space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {channel.bio || 'No description available'}
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Stats</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>Joined {new Date(channel.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                  <p>{formatCount(channel.subscriberCount || 0)} subscribers</p>
                  <p>{videos.length} videos</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { usersApi, type User, type Video } from '@/lib/api';
import VideoCard from '@/components/VideoCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isLoggedIn } = useAuth();

  const [profile, setProfile] = useState<User | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      usersApi.getProfile(id),
      usersApi.getUserVideos(id),
    ]).then(([p, v]) => {
      setProfile(p);
      setVideos(v);
    }).catch(() => setError('User not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleFollow = async () => {
    if (!isLoggedIn) { router.push('/auth/login'); return; }
    setFollowLoading(true);
    try {
      if (following) { await usersApi.unfollow(id); }
      else { await usersApi.follow(id); }
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

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      {/* Channel banner */}
      <div className="h-36 sm:h-48 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500" />

      <div className="max-w-[1200px] mx-auto px-4">
        {/* Channel header */}
        <div className="flex items-end gap-5 -mt-10 mb-6 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
          {/* Avatar */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 flex-shrink-0"
            style={{ borderColor: 'var(--background)', background: 'var(--background)' }}>
            {profile.avatarUrl ? (
              <Image
                src={`${API_URL}/${profile.avatarUrl}`}
                alt={profile.name}
                width={96}
                height={96}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Info + follow */}
          <div className="flex-1 min-w-0 pb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{profile.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {videos.length} video{videos.length !== 1 ? 's' : ''} · Joined {new Date(profile.createdAt).toLocaleDateString()}
            </p>
            {profile.bio && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{profile.bio}</p>
            )}
          </div>

          <button
            onClick={handleFollow}
            disabled={followLoading}
            className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-colors disabled:opacity-50 ${
              following
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-gray-900 text-white hover:bg-gray-700'
            }`}
          >
            {followLoading ? '...' : following ? 'Subscribed' : 'Subscribe'}
          </button>
        </div>

        {/* Videos grid */}
        {videos.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-3">🎬</div>
            <p className="text-lg font-medium text-gray-600 mb-1">No videos yet</p>
            <p className="text-sm">This channel hasn&apos;t uploaded any videos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 pb-10">
            {videos.map(video => (
              <VideoCard key={video.id} video={video} showChannel={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

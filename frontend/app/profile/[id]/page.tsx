'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usersApi, type User, type Video } from '@/lib/api';
import VideoCard from '@/components/VideoCard';

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
    const load = async () => {
      try {
        const [p, v] = await Promise.all([
          usersApi.getProfile(id),
          usersApi.getUserVideos(id),
        ]);
        setProfile(p);
        setVideos(v);
      } catch {
        setError('User not found');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleFollow = async () => {
    if (!isLoggedIn) { router.push('/auth/login'); return; }
    setFollowLoading(true);
    try {
      if (following) {
        await usersApi.unfollow(id);
      } else {
        await usersApi.follow(id);
      }
      setFollowing(f => !f);
    } catch {
      // already following/not following — ignore
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error || 'User not found'}</p>
          <Link href="/" className="text-blue-600 hover:underline">← Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Profile card */}
        <div className="bg-white rounded-xl p-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar placeholder */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{profile.name}</h1>
              {profile.bio && (
                <p className="text-gray-500 text-sm mt-1 max-w-md">{profile.bio}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Joined {new Date(profile.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Follow button */}
          <button
            onClick={handleFollow}
            disabled={followLoading}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors flex-shrink-0 disabled:opacity-50 ${
              following
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {followLoading ? '...' : following ? 'Following' : 'Follow'}
          </button>
        </div>

        {/* Videos section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Videos ({videos.length})
          </h2>

          {videos.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-gray-400">
              <div className="text-4xl mb-2">🎬</div>
              <p>No videos yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map(video => (
                <VideoCard key={video.id} video={video} showChannel={false} />
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

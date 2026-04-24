'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { videosApi, likesApi, commentsApi, type Video, type Comment } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isLoggedIn } = useAuth();

  const [video, setVideo] = useState<Video | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [error, setError] = useState('');
  const commentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [v, c] = await Promise.all([
          videosApi.getOne(id),
          commentsApi.getAll(id),
        ]);
        setVideo(v);
        setLikeCount(v.likeCount);
        setComments(c);
      } catch {
        setError('Video not found');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleLike = async () => {
    if (!isLoggedIn) { router.push('/auth/login'); return; }
    try {
      if (liked) {
        await likesApi.unlike(id);
        setLikeCount(c => c - 1);
      } else {
        await likesApi.like(id);
        setLikeCount(c => c + 1);
      }
      setLiked(l => !l);
    } catch {
      // already liked/unliked — ignore
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) { router.push('/auth/login'); return; }
    if (!commentText.trim()) return;

    setCommentLoading(true);
    try {
      const newComment = await commentsApi.create(id, commentText.trim());
      setComments(prev => [newComment, ...prev]);
      setCommentText('');
    } catch {
      setError('Failed to post comment');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await commentsApi.remove(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error || 'Video not found'}</p>
          <Link href="/" className="text-blue-600 hover:underline">← Back to home</Link>
        </div>
      </div>
    );
  }

  const videoSrc = video.filePath?.startsWith('http')
    ? video.filePath
    : `${API_URL}/${video.filePath}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-blue-600">VideoHub</Link>
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">← All videos</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left — video + info */}
          <div className="lg:col-span-2 space-y-4">

            {/* Video player */}
            <div className="bg-black rounded-xl overflow-hidden aspect-video">
              {video.status === 'PROCESSING' ? (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <div className="text-center">
                    <div className="text-3xl mb-2">⏳</div>
                    <p className="text-sm">Video is processing...</p>
                  </div>
                </div>
              ) : video.filePath ? (
                <video
                  src={videoSrc}
                  controls
                  className="w-full h-full"
                  preload="metadata"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span className="text-4xl">🎬</span>
                </div>
              )}
            </div>

            {/* Title + meta */}
            <div className="bg-white rounded-xl p-4">
              <h1 className="text-xl font-bold text-gray-900 mb-1">{video.title}</h1>
              {video.description && (
                <p className="text-gray-600 text-sm mb-3">{video.description}</p>
              )}
              <div className="flex items-center justify-between">
                <Link
                  href={`/profile/${video.user.id}`}
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  {video.user.name}
                </Link>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-400">
                    {new Date(video.createdAt).toLocaleDateString()}
                  </span>
                  {/* Like button */}
                  <button
                    onClick={handleLike}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      liked
                        ? 'bg-red-100 text-red-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500'
                    }`}
                  >
                    {liked ? '❤️' : '🤍'} {likeCount}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right — comments */}
          <div className="bg-white rounded-xl p-4 flex flex-col h-fit max-h-[600px]">
            <h2 className="font-semibold text-gray-900 mb-3">
              Comments ({video.commentCount})
            </h2>

            {/* Comment input */}
            <form onSubmit={handleComment} className="mb-4">
              <div className="flex gap-2">
                <input
                  ref={commentInputRef}
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder={isLoggedIn ? 'Add a comment...' : 'Login to comment'}
                  disabled={!isLoggedIn || commentLoading}
                  maxLength={500}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
                <button
                  type="submit"
                  disabled={!isLoggedIn || commentLoading || !commentText.trim()}
                  className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Post
                </button>
              </div>
            </form>

            {/* Comment list */}
            <div className="overflow-y-auto space-y-3 flex-1">
              {comments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No comments yet</p>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="flex gap-2 group">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Link
                          href={`/profile/${comment.user.id}`}
                          className="text-xs font-semibold text-gray-800 hover:text-blue-600"
                        >
                          {comment.user.name}
                        </Link>
                        <span className="text-xs text-gray-400">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{comment.content}</p>
                    </div>
                    {isLoggedIn && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-gray-300 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

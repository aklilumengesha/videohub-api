'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Comment } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'today';
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  return `${Math.floor(months / 12)} year${Math.floor(months / 12) !== 1 ? 's' : ''} ago`;
}

interface CommentThreadProps {
  comment: Comment;
  isVideoOwner: boolean;
  currentUserId?: string;
  onReply: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onLike: (commentId: string) => Promise<void>;
  onUnlike: (commentId: string) => Promise<void>;
  onPin?: (commentId: string) => Promise<void>;
  onHeart?: (commentId: string) => Promise<void>;
  depth?: number;
}

export default function CommentThread({
  comment,
  isVideoOwner,
  currentUserId,
  onReply,
  onDelete,
  onLike,
  onUnlike,
  onPin,
  onHeart,
  depth = 0,
}: CommentThreadProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [liked, setLiked] = useState(false);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setReplying(true);
    try {
      await onReply(comment.id, replyText.trim());
      setReplyText('');
      setShowReplyForm(false);
      setShowReplies(true);
    } finally {
      setReplying(false);
    }
  };

  const handleLike = async () => {
    if (liked) {
      await onUnlike(comment.id);
      setLiked(false);
    } else {
      await onLike(comment.id);
      setLiked(true);
    }
  };

  const replyCount = comment._count?.replies || 0;
  const isOwner = currentUserId === comment.user.id;

  return (
    <div className={`flex gap-3 group ${depth > 0 ? 'ml-12' : ''}`}>
      {/* Avatar */}
      <Link href={`/profile/${comment.user.id}`}
        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden">
        {comment.user.avatarUrl ? (
          <img src={`${API_URL}/${comment.user.avatarUrl}`} alt={comment.user.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
            {comment.user.name.charAt(0).toUpperCase()}
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <Link href={`/profile/${comment.user.id}`}
            className="text-sm font-semibold text-gray-900 hover:text-blue-600">
            {comment.user.name}
          </Link>
          <span className="text-xs text-gray-400">{timeAgo(comment.createdAt)}</span>
          {comment.isPinned && (
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              📌 Pinned
            </span>
          )}
        </div>

        {/* Comment text */}
        <p className="text-sm text-gray-700 mb-2">{comment.content}</p>

        {/* Heart from creator */}
        {comment.isHearted && (
          <div className="inline-flex items-center gap-1 text-xs text-red-500 mb-2">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span className="font-medium">by creator</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 text-xs">
          {/* Like button */}
          {currentUserId && (
            <button onClick={handleLike}
              className={`flex items-center gap-1 font-medium transition-colors ${
                liked ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
              }`}>
              <svg className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
              {comment.likeCount > 0 ? comment.likeCount : 'Like'}
            </button>
          )}

          {/* Reply button */}
          {currentUserId && depth < 2 && (
            <button onClick={() => setShowReplyForm(v => !v)}
              className="font-medium text-gray-600 hover:text-blue-600 transition-colors">
              Reply
            </button>
          )}

          {/* Pin button (video owner only) */}
          {isVideoOwner && onPin && depth === 0 && (
            <button onClick={() => onPin(comment.id)}
              className="font-medium text-gray-600 hover:text-blue-600 transition-colors">
              {comment.isPinned ? 'Unpin' : 'Pin'}
            </button>
          )}

          {/* Heart button (video owner only) */}
          {isVideoOwner && onHeart && (
            <button onClick={() => onHeart(comment.id)}
              className="font-medium text-gray-600 hover:text-red-500 transition-colors">
              {comment.isHearted ? '💔 Unheart' : '❤️ Heart'}
            </button>
          )}

          {/* Delete button (comment owner only) */}
          {isOwner && (
            <button onClick={() => onDelete(comment.id)}
              className="font-medium text-gray-600 hover:text-red-500 transition-colors">
              Delete
            </button>
          )}
        </div>

        {/* Reply form */}
        {showReplyForm && (
          <form onSubmit={handleReply} className="mt-3 flex gap-2">
            <input type="text" value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Add a reply..."
              disabled={replying}
              maxLength={500}
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50" />
            <button type="submit" disabled={replying || !replyText.trim()}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {replying ? 'Posting...' : 'Reply'}
            </button>
          </form>
        )}

        {/* Show replies button */}
        {replyCount > 0 && depth < 2 && (
          <button onClick={() => setShowReplies(v => !v)}
            className="mt-3 flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
            <svg className={`w-4 h-4 transition-transform ${showReplies ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {showReplies ? 'Hide' : 'Show'} {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </button>
        )}

        {/* Nested replies */}
        {showReplies && comment.replies && comment.replies.length > 0 && (
          <div className="mt-4 space-y-4">
            {comment.replies.map(reply => (
              <CommentThread
                key={reply.id}
                comment={reply}
                isVideoOwner={isVideoOwner}
                currentUserId={currentUserId}
                onReply={onReply}
                onDelete={onDelete}
                onLike={onLike}
                onUnlike={onUnlike}
                onHeart={onHeart}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

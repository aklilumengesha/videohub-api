'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { videosApi } from '@/lib/api';

const CATEGORIES = [
  'Gaming', 'Music', 'Education', 'Entertainment', 'Sports',
  'Technology', 'Travel', 'Food', 'Fashion', 'News', 'Other',
];

type UploadState = 'idle' | 'uploading' | 'processing' | 'ready' | 'error';

export default function UploadPage() {
  const router = useRouter();
  const { isLoggedIn, loading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !isLoggedIn) router.push('/auth/login');
  }, [isLoggedIn, loading, router]);

  // Poll processing status after upload
  useEffect(() => {
    if (uploadState !== 'processing' || !videoId) return;

    pollRef.current = setInterval(async () => {
      try {
        const status = await videosApi.getStatus(videoId);
        if (status.status === 'READY') {
          clearInterval(pollRef.current!);
          setUploadState('ready');
          setTimeout(() => router.push(`/videos/${videoId}`), 1500);
        } else if (status.status === 'FAILED') {
          clearInterval(pollRef.current!);
          setUploadState('error');
          setError('Video processing failed. Please try again.');
        }
      } catch { /* ignore poll errors */ }
    }, 3000); // poll every 3 seconds

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [uploadState, videoId, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.type.startsWith('video/')) { setError('Please select a video file'); return; }
      setFile(selected);
      setError('');
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (tag && !tags.includes(tag) && tags.length < 10) setTags(prev => [...prev, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError('Please select a video file'); return; }
    setError('');
    setUploadState('uploading');
    setUploadProgress(0);

    try {
      // Simulate upload progress using XHR for real progress events
      const result = await uploadWithProgress(file, title, description);
      setVideoId(result.id);
      setUploadState('processing');
      setUploadProgress(100);
    } catch (err: unknown) {
      setUploadState('error');
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const uploadWithProgress = (
    file: File,
    title: string,
    description: string,
  ): Promise<{ id: string; status: string }> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('title', title);
      if (description) formData.append('description', description);
      if (category) formData.append('category', category);
      tags.forEach(t => formData.append('tags[]', t));
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      const token = localStorage.getItem('accessToken');

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 95)); // cap at 95% until server responds
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch { reject(new Error('Invalid server response')); }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.message || `HTTP ${xhr.status}`));
          } catch { reject(new Error(`HTTP ${xhr.status}`)); }
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network error')));
      xhr.open('POST', `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/videos/upload`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  };

  if (loading || !isLoggedIn) return null;

  // Processing state
  if (uploadState === 'processing' || uploadState === 'ready') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm">
          {uploadState === 'ready' ? (
            <>
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Video ready!</h2>
              <p className="text-gray-500">Redirecting to your video...</p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4 animate-spin">⚙️</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing your video</h2>
              <p className="text-gray-500 mb-4">Encoding to multiple qualities for adaptive streaming...</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
              <p className="text-xs text-gray-400 mt-2">This may take a few minutes</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Video</h1>
        <p className="text-gray-500 text-sm mb-8">Share your video with the community</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">

          {/* File picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Video File *</label>
            <div onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
              {file ? (
                <div>
                  <div className="text-2xl mb-1">🎬</div>
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              ) : (
                <div>
                  <div className="text-3xl mb-2">📁</div>
                  <p className="text-sm text-gray-600">Click to select a video file</p>
                  <p className="text-xs text-gray-400 mt-1">MP4, MOV, AVI up to 100MB</p>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
          </div>

          {/* Upload progress bar */}
          {uploadState === 'uploading' && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required minLength={3} maxLength={100}
              placeholder="Give your video a title"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} maxLength={500}
              placeholder="Describe your video (optional)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Select a category (optional)</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <div className="border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
              <div className="flex flex-wrap gap-1.5 mb-1">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                    #{tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
              <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleAddTag}
                placeholder={tags.length < 10 ? 'Type a tag and press Enter...' : 'Max 10 tags'}
                disabled={tags.length >= 10}
                className="w-full text-sm outline-none disabled:opacity-50" />
            </div>
            <p className="text-xs text-gray-400 mt-1">Press Enter or comma to add. Max 10 tags.</p>
          </div>

          <button type="submit" disabled={uploadState === 'uploading' || !file}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {uploadState === 'uploading' ? `Uploading ${uploadProgress}%...` : 'Upload Video'}
          </button>
        </form>
      </main>
    </div>
  );
}

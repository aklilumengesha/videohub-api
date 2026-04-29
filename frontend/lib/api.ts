// Centralized API client — automatically attaches JWT to protected requests

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ── Token Management ──────────────────────────────────────────────────────────

export const tokenStorage = {
  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  },
  getRefreshToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  },
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  },
  clearTokens: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};

// ── Base fetch wrapper ────────────────────────────────────────────────────────

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = tokenStorage.getAccessToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || `HTTP ${response.status}`);
  }

  return data;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  isVerified?: boolean;
  subscriberCount?: number;
  createdAt: string;
}

export interface Video {
  id: string;
  title: string;
  description?: string;
  filePath?: string;
  hlsUrl?: string;
  thumbnailUrl?: string;
  likeCount: number;
  dislikeCount?: number;
  commentCount: number;
  viewCount: number;
  duration?: number;
  status?: string;
  createdAt: string;
  user: { id: string; name: string };
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  likeCount: number;
  isPinned?: boolean;
  isHearted?: boolean;
  user: { id: string; name: string; avatarUrl?: string };
  _count?: { replies: number };
  replies?: Comment[];
}

export interface Notification {
  id: string;
  type: string;
  read: boolean;
  videoId?: string;
  createdAt: string;
  actor: { id: string; name: string };
}

export interface Playlist {  id: string;
  title: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  _count?: { videos: number };
  user?: { id: string; name: string };
  videos?: Array<{
    position: number;
    addedAt: string;
    video: {
      id: string;
      title: string;
      thumbnailUrl?: string;
      duration?: number;
      viewCount: number;
      createdAt: string;
      user: { id: string; name: string };
    };
  }>;
}

export interface VideoChapter {
  id: string;
  title: string;
  startTime: number;  // seconds
  position: number;
}

export interface VideoSubtitle {
  id: string;
  language: string;  // BCP-47 e.g. "en"
  label: string;     // display name e.g. "English"
  filePath: string;
}

// ── Auth API ──────────────────────────────────────────────────────────────────

export const authApi = {
  register: async (name: string, email: string, password: string) => {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    tokenStorage.setTokens(data.accessToken, data.refreshToken);
    return data;
  },

  login: async (email: string, password: string) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    tokenStorage.setTokens(data.accessToken, data.refreshToken);
    return data;
  },

  logout: async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      tokenStorage.clearTokens();
    }
  },
};

// ── Users API ─────────────────────────────────────────────────────────────────

export const usersApi = {
  getMe: () => apiFetch('/users/me'),

  updateMe: (data: { name?: string; bio?: string }) =>
    apiFetch('/users/me', { method: 'PUT', body: JSON.stringify(data) }),

  getProfile: (id: string) => apiFetch(`/users/${id}`),

  getUserVideos: (id: string) => apiFetch(`/users/${id}/videos`),

  follow: (id: string) =>
    apiFetch(`/users/${id}/follow`, { method: 'POST' }),

  unfollow: (id: string) =>
    apiFetch(`/users/${id}/follow`, { method: 'DELETE' }),

  isFollowing: (id: string) =>
    apiFetch(`/users/${id}/is-following`),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiFetch('/users/me/avatar', { method: 'POST', body: formData });
  },

  uploadBanner: (file: File) => {
    const formData = new FormData();
    formData.append('banner', file);
    return apiFetch('/users/me/banner', { method: 'POST', body: formData });
  },

  getHistory: (cursor?: string) =>
    apiFetch(`/users/me/history${cursor ? `?cursor=${cursor}` : ''}`),

  clearHistory: () =>
    apiFetch('/users/me/history', { method: 'DELETE' }),

  getFollowers: (id: string, cursor?: string) =>
    apiFetch(`/users/${id}/followers${cursor ? `?cursor=${cursor}` : ''}`),

  getFollowing: (id: string, cursor?: string) =>
    apiFetch(`/users/${id}/following${cursor ? `?cursor=${cursor}` : ''}`),
};

// ── Videos API ────────────────────────────────────────────────────────────────

export const videosApi = {
  getAll: (category?: string, sort?: 'newest' | 'popular') =>
    apiFetch(`/videos${category || sort ? `?${new URLSearchParams({ ...(category ? { category } : {}), ...(sort ? { sort } : {}) }).toString()}` : ''}`),

  getOne: (id: string) => apiFetch(`/videos/${id}`),

  getTrending: () => apiFetch('/videos/trending'),

  getRelated: (id: string) => apiFetch(`/videos/${id}/related`),

  getStatus: (id: string) => apiFetch(`/videos/${id}/status`),

  upload: (title: string, description: string, file: File) => {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('file', file);
    return apiFetch('/videos/upload', { method: 'POST', body: formData });
  },

  update: (id: string, data: { title?: string; description?: string }) =>
    apiFetch(`/videos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  remove: (id: string) =>
    apiFetch(`/videos/${id}`, { method: 'DELETE' }),

  recordWatch: (id: string, progress?: number) =>
    apiFetch(`/videos/${id}/watch`, { 
      method: 'POST',
      body: JSON.stringify({ progress }),
    }),

  getProgress: (id: string) =>
    apiFetch(`/videos/${id}/progress`),

  getChapters: (id: string) => apiFetch(`/videos/${id}/chapters`),

  setChapters: (id: string, chapters: Array<{ title: string; startTime: number }>) =>
    apiFetch(`/videos/${id}/chapters`, { method: 'POST', body: JSON.stringify({ chapters }) }),

  getSubtitles: (id: string) => apiFetch(`/videos/${id}/subtitles`),

  addSubtitle: (id: string, language: string, label: string, file: File) => {
    const formData = new FormData();
    formData.append('language', language);
    formData.append('label', label);
    formData.append('file', file);
    return apiFetch(`/videos/${id}/subtitles`, { method: 'POST', body: formData });
  },

  removeSubtitle: (videoId: string, subtitleId: string) =>
    apiFetch(`/videos/${videoId}/subtitles/${subtitleId}`, { method: 'DELETE' }),
};

// ── Likes API ─────────────────────────────────────────────────────────────────

export const likesApi = {
  isLiked: (videoId: string) => apiFetch(`/videos/${videoId}/like`),

  like: (videoId: string) =>
    apiFetch(`/videos/${videoId}/like`, { method: 'POST' }),

  unlike: (videoId: string) =>
    apiFetch(`/videos/${videoId}/like`, { method: 'DELETE' }),

  isDisliked: (videoId: string) => apiFetch(`/videos/${videoId}/dislike`),

  dislike: (videoId: string) =>
    apiFetch(`/videos/${videoId}/dislike`, { method: 'POST' }),

  undislike: (videoId: string) =>
    apiFetch(`/videos/${videoId}/dislike`, { method: 'DELETE' }),
};

// ── Comments API ──────────────────────────────────────────────────────────────

export const commentsApi = {
  getAll: (videoId: string, cursor?: string, sort?: 'top' | 'newest') =>
    apiFetch(`/videos/${videoId}/comments${cursor || sort ? `?${new URLSearchParams({ ...(cursor ? { cursor } : {}), ...(sort ? { sort } : {}) }).toString()}` : ''}`),

  create: (videoId: string, content: string) =>
    apiFetch(`/videos/${videoId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  reply: (commentId: string, content: string) =>
    apiFetch(`/comments/${commentId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  remove: (commentId: string) =>
    apiFetch(`/comments/${commentId}`, { method: 'DELETE' }),

  like: (commentId: string) =>
    apiFetch(`/comments/${commentId}/like`, { method: 'POST' }),

  unlike: (commentId: string) =>
    apiFetch(`/comments/${commentId}/like`, { method: 'DELETE' }),

  pin: (commentId: string) =>
    apiFetch(`/comments/${commentId}/pin`, { method: 'POST' }),

  heart: (commentId: string) =>
    apiFetch(`/comments/${commentId}/heart`, { method: 'POST' }),
};

// ── Feed API ──────────────────────────────────────────────────────────────────

export const feedApi = {
  getPersonalized: (cursor?: string) =>
    apiFetch(`/feed${cursor ? `?cursor=${cursor}` : ''}`),

  getExplore: (cursor?: string) =>
    apiFetch(`/feed/explore${cursor ? `?cursor=${cursor}` : ''}`),
};

// ── Search API ────────────────────────────────────────────────────────────────

export const searchApi = {
  videos: (q: string, cursor?: string, uploadDate?: string, sortBy?: string) => {
    const params = new URLSearchParams({ q });
    if (cursor) params.set('cursor', cursor);
    if (uploadDate) params.set('uploadDate', uploadDate);
    if (sortBy) params.set('sortBy', sortBy);
    return apiFetch(`/search/videos?${params.toString()}`);
  },

  users: (q: string, cursor?: string) =>
    apiFetch(`/search/users?q=${encodeURIComponent(q)}${cursor ? `&cursor=${cursor}` : ''}`),
};

// ── Analytics API ─────────────────────────────────────────────────────────────

export const analyticsApi = {
  getOverview: () => apiFetch('/analytics/overview'),
  getVideoStats: () => apiFetch('/analytics/videos'),
  getDailyViews: (days = 30) => apiFetch(`/analytics/views?days=${days}`),
  getTopVideo: () => apiFetch('/analytics/top-video'),
};

// ── Admin / Reports API ───────────────────────────────────────────────────────

export const adminApi = {
  reportVideo: (videoId: string, reason: string, details?: string) =>
    apiFetch(`/videos/${videoId}/report`, { method: 'POST', body: JSON.stringify({ reason, details }) }),

  getStats: () => apiFetch('/admin/stats'),

  getReports: (status?: string) =>
    apiFetch(`/admin/reports${status ? `?status=${status}` : ''}`),

  resolveReport: (reportId: string, status: 'RESOLVED' | 'DISMISSED') =>
    apiFetch(`/admin/reports/${reportId}`, { method: 'PUT', body: JSON.stringify({ status }) }),
};

// ── Playlists API ─────────────────────────────────────────────────────────────
export const playlistsApi = {
  create: (data: { title: string; description?: string; isPublic?: boolean }) =>
    apiFetch('/playlists', { method: 'POST', body: JSON.stringify(data) }),

  getMine: () => apiFetch('/playlists/me'),

  getOne: (id: string) => apiFetch(`/playlists/${id}`),

  addVideo: (playlistId: string, videoId: string) =>
    apiFetch(`/playlists/${playlistId}/videos/${videoId}`, { method: 'POST' }),

  removeVideo: (playlistId: string, videoId: string) =>
    apiFetch(`/playlists/${playlistId}/videos/${videoId}`, { method: 'DELETE' }),

  delete: (id: string) =>
    apiFetch(`/playlists/${id}`, { method: 'DELETE' }),

  update: (id: string, data: { title?: string; description?: string; isPublic?: boolean }) =>
    apiFetch(`/playlists/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Get or create the "Watch Later" playlist, then add the video
  saveToWatchLater: async (videoId: string) => {
    const playlists: Playlist[] = await apiFetch('/playlists/me');
    let watchLater = playlists.find((p: Playlist) => p.title === 'Watch Later');
    if (!watchLater) {
      watchLater = await apiFetch('/playlists', {
        method: 'POST',
        body: JSON.stringify({ title: 'Watch Later', isPublic: false }),
      });
    }
    return apiFetch(`/playlists/${watchLater!.id}/videos/${videoId}`, { method: 'POST' });
  },
};

// ── Notifications API ─────────────────────────────────────────────────────────

export const notificationsApi = {  getAll: (cursor?: string) =>
    apiFetch(`/notifications${cursor ? `?cursor=${cursor}` : ''}`),

  getUnreadCount: () => apiFetch('/notifications/unread-count'),

  markAllRead: () =>
    apiFetch('/notifications/read-all', { method: 'PUT' }),

  markRead: (id: string) =>
    apiFetch(`/notifications/${id}/read`, { method: 'PUT' }),
};

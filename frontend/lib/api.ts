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
  user: { id: string; name: string };
}

export interface Notification {
  id: string;
  type: string;
  read: boolean;
  videoId?: string;
  createdAt: string;
  actor: { id: string; name: string };
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

  getFollowers: (id: string, cursor?: string) =>
    apiFetch(`/users/${id}/followers${cursor ? `?cursor=${cursor}` : ''}`),

  getFollowing: (id: string, cursor?: string) =>
    apiFetch(`/users/${id}/following${cursor ? `?cursor=${cursor}` : ''}`),
};

// ── Videos API ────────────────────────────────────────────────────────────────

export const videosApi = {
  getAll: () => apiFetch('/videos'),

  getOne: (id: string) => apiFetch(`/videos/${id}`),

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
};

// ── Likes API ─────────────────────────────────────────────────────────────────

export const likesApi = {
  like: (videoId: string) =>
    apiFetch(`/videos/${videoId}/like`, { method: 'POST' }),

  unlike: (videoId: string) =>
    apiFetch(`/videos/${videoId}/like`, { method: 'DELETE' }),
};

// ── Comments API ──────────────────────────────────────────────────────────────

export const commentsApi = {
  getAll: (videoId: string, cursor?: string) =>
    apiFetch(`/videos/${videoId}/comments${cursor ? `?cursor=${cursor}` : ''}`),

  create: (videoId: string, content: string) =>
    apiFetch(`/videos/${videoId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  remove: (commentId: string) =>
    apiFetch(`/comments/${commentId}`, { method: 'DELETE' }),
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
  videos: (q: string, cursor?: string) =>
    apiFetch(`/search/videos?q=${encodeURIComponent(q)}${cursor ? `&cursor=${cursor}` : ''}`),

  users: (q: string, cursor?: string) =>
    apiFetch(`/search/users?q=${encodeURIComponent(q)}${cursor ? `&cursor=${cursor}` : ''}`),
};

// ── Notifications API ─────────────────────────────────────────────────────────

export const notificationsApi = {
  getAll: (cursor?: string) =>
    apiFetch(`/notifications${cursor ? `?cursor=${cursor}` : ''}`),

  getUnreadCount: () => apiFetch('/notifications/unread-count'),

  markAllRead: () =>
    apiFetch('/notifications/read-all', { method: 'PUT' }),
};

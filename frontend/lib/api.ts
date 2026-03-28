// API Client — centralized place for all backend calls
// Automatically attaches JWT token to protected requests
// This is the key pattern for frontend-backend integration

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ── Token Management ──────────────────────────────────────
// Tokens are stored in localStorage (client-side only)
// In production, consider httpOnly cookies for better security

export const tokenStorage = {
  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null; // SSR guard
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

// ── Base fetch wrapper ────────────────────────────────────
// Adds Authorization header automatically when token exists
async function apiFetch(path: string, options: RequestInit = {}) {
  const token = tokenStorage.getAccessToken();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Only set Content-Type for non-FormData requests
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Attach JWT token if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  // Parse response
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || `HTTP ${response.status}`);
  }

  return data;
}

// ── Auth API ──────────────────────────────────────────────
export const authApi = {
  register: async (name: string, email: string, password: string) => {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    // Save tokens after successful registration
    tokenStorage.setTokens(data.accessToken, data.refreshToken);
    return data;
  },

  login: async (email: string, password: string) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    // Save tokens after successful login
    tokenStorage.setTokens(data.accessToken, data.refreshToken);
    return data;
  },

  logout: () => {
    tokenStorage.clearTokens();
  },
};

// ── Videos API ────────────────────────────────────────────
export const videosApi = {
  getAll: async () => {
    return apiFetch('/videos');
  },

  upload: async (title: string, description: string, file: File) => {
    // FormData for multipart/form-data file upload
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('file', file);

    return apiFetch('/videos/upload', {
      method: 'POST',
      body: formData,
      // Note: DO NOT set Content-Type header for FormData
      // The browser sets it automatically with the correct boundary
    });
  },
};

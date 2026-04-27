# VideoHub

A full-stack YouTube-like video platform built with NestJS, Next.js, PostgreSQL, Redis, and BullMQ.

---

## Tech Stack

### Backend (`/videohub`)
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 |
| Framework | NestJS 11 |
| Language | TypeScript (strict) |
| Database | PostgreSQL via Prisma ORM |
| Queue | BullMQ + Redis |
| Auth | JWT (access + refresh tokens, bcrypt) |
| Video | FFmpeg — HLS multi-quality encoding, thumbnail extraction |
| Storage | Local disk (`uploads/`) served as static files |
| Real-time | Server-Sent Events (SSE) |
| Security | Helmet, rate limiting (`@nestjs/throttler`) |
| Docs | Swagger/OpenAPI at `/api/docs` |

### Frontend (`/frontend`)
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Video Player | hls.js (adaptive bitrate streaming) |
| State | React Context (Auth, Theme) |

---

## Features

### Core Video Platform
- **HLS adaptive streaming** — FFmpeg encodes uploads to multi-quality HLS (360p/720p/1080p) with thumbnail extraction
- **Video upload** with async processing queue (BullMQ) and real-time status polling
- **Video player** with quality selector, poster image, and subtitle/caption support
- **View count** with Redis-based deduplication (1 view per IP per hour)
- **Categories & tags** on videos with filter/sort on home page

### Social Features
- **Likes** with atomic counter updates
- **Comments** with cursor pagination
- **Follow/Unfollow** users
- **Personalized feed** from followed creators
- **Notifications** (likes, comments, follows) with real-time SSE push

### Creator Tools
- **My Channel** page — profile editing, avatar upload, video management
- **Analytics dashboard** — total views/likes/comments/subscribers, per-video breakdown, daily views chart
- **Video chapters** — timestamped chapter markers with click-to-seek
- **Subtitles/Captions** — upload VTT files, rendered as native `<track>` elements
- **Upload progress bar** with XHR and processing status polling

### Discovery
- **Trending page** — most viewed videos in the last 7 days
- **Search** — debounced video and user search with tabs
- **Related videos** sidebar on video page
- **Explore feed** — all videos, no auth required

### User Library
- **Watch history** — auto-recorded on video load, paginated, clearable
- **Playlists** — create/manage playlists, add/remove videos, public/private
- **Save to playlist** dropdown on video page

### Platform
- **Dark mode** — system-aware with manual toggle, persisted to localStorage
- **Keyboard shortcuts** — `/` search, `?` help, `k` play/pause, `j`/`l` seek, `f` fullscreen, `m` mute
- **Video reports** — users can report videos; admin panel to review/resolve
- **Admin panel** — platform stats, report queue with resolve/dismiss actions
- **Real-time notifications** via SSE (falls back to 30s polling)
- **Avatar upload** — profile pictures stored and displayed across the app
- **Health check** endpoint (`GET /health`) for monitoring

### Security & Performance
- JWT access + refresh token rotation with hashed storage
- Rate limiting on all endpoints
- Helmet security headers
- Redis view count debouncing
- Cursor-based pagination throughout

---

## Quick Start

### Prerequisites
- Node.js 20+
- Docker Desktop (for PostgreSQL + Redis)

### 1. Start infrastructure

```bash
cd "VideoHub API"
docker-compose up -d
```

This starts PostgreSQL on `5432` and Redis on `6379`.

### 2. Backend

```bash
cd videohub
npm install
cp .env.example .env   # fill in secrets
npx prisma db push     # create all tables
npm run start:dev
```

API: `http://localhost:3000`
Swagger: `http://localhost:3000/api/docs`

### 3. Frontend

```bash
cd frontend
npm install
# create .env.local:
# NEXT_PUBLIC_API_URL=http://localhost:3000
npm run dev
```

App: `http://localhost:3001`

---

## Environment Variables

### Backend (`.env`)

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/videohub
JWT_ACCESS_SECRET=your-access-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
REDIS_URL=redis://localhost:6379
PORT=3000
```

### Frontend (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## Project Structure

```
VideoHub API/
├── videohub/                  # NestJS backend
│   ├── prisma/
│   │   └── schema.prisma      # Full DB schema (17 models)
│   ├── src/
│   │   ├── auth/              # JWT auth, refresh, logout
│   │   ├── user/              # Profile, avatar, history, playlists
│   │   ├── video/             # Upload, HLS, chapters, subtitles, reports
│   │   ├── like/              # Like/unlike with counters
│   │   ├── comment/           # Comments with pagination
│   │   ├── follow/            # Follow/unfollow
│   │   ├── feed/              # Personalized + explore feeds
│   │   ├── search/            # Video + user search
│   │   ├── notification/      # Notification CRUD
│   │   ├── playlist/          # Playlist CRUD + video management
│   │   ├── admin/             # Reports + admin endpoints
│   │   ├── analytics/         # Creator analytics
│   │   ├── sse/               # Server-Sent Events for real-time push
│   │   └── health/            # Health check
│   └── uploads/               # Served as static files
│       ├── hls/               # HLS segments + playlists
│       ├── thumbnails/        # Generated JPEG thumbnails
│       ├── avatars/           # User avatar images
│       └── subtitles/         # VTT caption files
│
└── frontend/                  # Next.js frontend
    ├── app/
    │   ├── page.tsx           # Home — video grid with category tabs
    │   ├── videos/[id]/       # Video player with comments, chapters, subtitles
    │   ├── feed/              # Personalized feed
    │   ├── trending/          # Trending videos
    │   ├── search/            # Search with video/user tabs
    │   ├── profile/[id]/      # Public user profile
    │   ├── channel/           # My channel — profile + video management
    │   ├── analytics/         # Creator analytics dashboard
    │   ├── history/           # Watch history
    │   ├── playlists/         # Playlist management
    │   ├── notifications/     # Notification centre
    │   ├── upload/            # Video upload with progress
    │   ├── admin/             # Admin report panel
    │   └── auth/              # Login + register
    ├── components/
    │   ├── HlsPlayer.tsx      # Adaptive video player with subtitle tracks
    │   ├── VideoCard.tsx      # Thumbnail card with duration + views
    │   ├── Navbar.tsx         # Top bar with search, theme toggle, SSE
    │   ├── Sidebar.tsx        # Collapsible left navigation
    │   └── ShortcutsModal.tsx # Keyboard shortcuts reference
    ├── context/
    │   ├── AuthContext.tsx    # Global auth state
    │   └── ThemeContext.tsx   # Dark/light mode
    ├── hooks/
    │   └── useKeyboardShortcuts.ts
    └── lib/
        └── api.ts             # Typed API client for all endpoints
```

---

## Database Schema

17 Prisma models:

| Model | Purpose |
|-------|---------|
| `User` | Accounts with avatar, bio, isAdmin flag |
| `Video` | Videos with HLS, thumbnail, category, tags |
| `Like` | Composite key — one like per user per video |
| `Comment` | Comments with counter sync |
| `Follow` | Follower/following relationships |
| `Notification` | Like/comment/follow notifications |
| `WatchHistory` | Per-user watch history (upserted) |
| `Playlist` | User playlists (public/private) |
| `PlaylistVideo` | Videos in playlists with position ordering |
| `VideoChapter` | Timestamped chapter markers |
| `VideoSubtitle` | VTT subtitle tracks |
| `VideoReport` | User reports with reason + status |

---

## API Summary

Full interactive docs at `http://localhost:3000/api/docs`

| Module | Key Endpoints |
|--------|--------------|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` |
| Users | `GET/PUT /users/me`, `POST /users/me/avatar`, `GET/DELETE /users/me/history` |
| Videos | `GET /videos`, `POST /videos/upload`, `GET /videos/trending`, `GET /videos/:id/related` |
| Chapters | `GET/POST /videos/:id/chapters` |
| Subtitles | `GET/POST /videos/:id/subtitles`, `DELETE /videos/:id/subtitles/:id` |
| Likes | `POST/DELETE /videos/:id/like` |
| Comments | `GET/POST /videos/:id/comments`, `DELETE /comments/:id` |
| Follow | `POST/DELETE /users/:id/follow`, `GET /users/:id/followers` |
| Feed | `GET /feed`, `GET /feed/explore` |
| Search | `GET /search/videos?q=`, `GET /search/users?q=` |
| Playlists | `GET/POST /playlists`, `GET /playlists/me`, `POST/DELETE /playlists/:id/videos/:videoId` |
| Notifications | `GET /notifications`, `GET /notifications/unread-count`, `PUT /notifications/read-all` |
| SSE | `GET /sse/events` (real-time push via EventSource) |
| Analytics | `GET /analytics/overview`, `/analytics/videos`, `/analytics/views` |
| Admin | `POST /videos/:id/report`, `GET /admin/reports`, `PUT /admin/reports/:id` |
| Health | `GET /health` |

---

## Video Processing Flow

```
Upload → BullMQ job → FFmpeg HLS encode → thumbnails → status: READY
                                ↓
              uploads/hls/<videoId>/master.m3u8
              uploads/hls/<videoId>/360p/
              uploads/hls/<videoId>/720p/
              uploads/thumbnails/<videoId>.jpg
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus search bar |
| `?` | Show shortcuts help |
| `k` | Play / Pause |
| `j` | Seek back 10s |
| `l` | Seek forward 10s |
| `f` | Toggle fullscreen |
| `m` | Toggle mute |

---

## Running Tests

```bash
cd videohub
npm run test          # unit tests
npm run test:e2e      # end-to-end (requires running DB)
npm run test:cov      # coverage report
```

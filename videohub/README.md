# VideoHub API

A production-grade video sharing platform backend built with NestJS, PostgreSQL, Redis, and BullMQ.

## Tech Stack

- **Runtime**: Node.js 20
- **Framework**: NestJS 11
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL via Prisma ORM
- **Queue**: BullMQ + Redis
- **Auth**: JWT (access + refresh tokens)
- **Docs**: Swagger/OpenAPI at `/api/docs`

---

## Quick Start (Local)

### Prerequisites
- Node.js 20+
- PostgreSQL running locally or a Neon/Supabase cloud DB
- Redis running locally (`docker run -d -p 6379:6379 redis:7-alpine`)

### Setup

```bash
# Install dependencies
npm install

# Copy env file and fill in your values
cp .env.example .env

# Push schema to database
npx prisma db push

# Start in development mode
npm run start:dev
```

API available at: `http://localhost:3000`
Swagger docs at: `http://localhost:3000/api/docs`

---

## Quick Start (Docker)

```bash
# From the VideoHub API folder
docker-compose up --build
```

This starts PostgreSQL, Redis, and the NestJS API together.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `REDIS_URL` | Redis connection URL |
| `PORT` | Server port (default: 3000) |

---

## API Reference

### Auth
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/auth/register` | No | Register new user |
| POST | `/auth/login` | No | Login, returns tokens |
| POST | `/auth/logout` | JWT | Logout, clears refresh token |
| POST | `/auth/refresh` | Refresh token | Get new token pair |

### Users
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/users/me` | JWT | Get current user profile |
| PUT | `/users/me` | JWT | Update name and bio |
| GET | `/users/:id` | No | Get public profile |
| GET | `/users/:id/videos` | No | Get user's videos |
| POST | `/users/:id/follow` | JWT | Follow a user |
| DELETE | `/users/:id/follow` | JWT | Unfollow a user |
| GET | `/users/:id/followers` | No | Get followers list |
| GET | `/users/:id/following` | No | Get following list |

### Videos
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/videos` | No | List all videos |
| GET | `/videos/:id` | No | Get single video |
| GET | `/videos/:id/status` | No | Get processing status |
| POST | `/videos/upload` | JWT | Upload video (async processing) |
| PUT | `/videos/:id` | JWT | Update title/description (owner) |
| DELETE | `/videos/:id` | JWT | Delete video (owner) |

### Likes
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/videos/:videoId/like` | JWT | Like a video |
| DELETE | `/videos/:videoId/like` | JWT | Unlike a video |

### Comments
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/videos/:videoId/comments` | JWT | Add a comment |
| GET | `/videos/:videoId/comments` | No | Get comments (paginated) |
| DELETE | `/comments/:commentId` | JWT | Delete comment (owner) |

### Feed
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/feed` | JWT | Personalized feed from followed users |
| GET | `/feed/explore` | No | All videos, no auth required |

### Search
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/search/videos?q=` | No | Search videos by title/description |
| GET | `/search/users?q=` | No | Search users by name/bio |

### Notifications
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/notifications` | JWT | Get notifications (paginated) |
| GET | `/notifications/unread-count` | JWT | Get unread count |
| PUT | `/notifications/read-all` | JWT | Mark all as read |

### Health
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/health` | No | Check DB and Redis status |

---

## Cursor Pagination

All paginated endpoints accept:
- `cursor` — ISO date string of the last item's `createdAt`
- `limit` — number of items to return (default: 20)

First page: no cursor. Next page: pass `createdAt` of the last item received.

---

## Video Processing Flow

1. `POST /videos/upload` saves the raw file and returns `{ id, status: "PROCESSING" }` immediately
2. BullMQ worker picks up the compression job
3. FFmpeg compresses to H.264/AAC with web-optimized settings
4. Video record updated to `status: "READY"` with compressed file path
5. Client polls `GET /videos/:id/status` until `READY`

---

## Running Tests

```bash
# Unit tests
npm run test

# E2E tests (requires running DB)
npm run test:e2e

# Coverage
npm run test:cov
```

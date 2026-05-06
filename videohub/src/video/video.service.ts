import { Injectable, OnModuleInit } from '@nestjs/common';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { FfmpegService } from './ffmpeg.service';
import { UploadVideoDto } from './dto/upload-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { SetChaptersDto } from './dto/set-chapters.dto';
import { UploadSubtitleDto } from './dto/upload-subtitle.dto';
import { VIDEO_PROCESSING_QUEUE } from './video.constants';

@Injectable()
export class VideoService implements OnModuleInit {
  private redis!: Redis;

  constructor(
    private prisma: PrismaService,
    private ffmpeg: FfmpegService,
    @InjectQueue(VIDEO_PROCESSING_QUEUE) private videoQueue: Queue,
  ) {}

  onModuleInit() {
    // Create a dedicated Redis client for view count debouncing
    this.redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  }

  // Increment view count at most once per IP per video per hour
  private async incrementViewCount(videoId: string, ip: string): Promise<void> {
    const key = `view:${videoId}:${ip}`;
    const alreadyViewed = await this.redis.get(key);
    if (alreadyViewed) return;

    // Mark as viewed for 1 hour, then increment
    await this.redis.setex(key, 3600, '1');
    await this.prisma.video.update({
      where: { id: videoId },
      data: { viewCount: { increment: 1 } },
    });
  }

  async findAll(category?: string, sortBy: 'newest' | 'popular' = 'newest', isShort?: boolean) {
    return this.prisma.video.findMany({
      where: {
        status: { in: ['READY', 'FAILED'] },
        visibility: 'PUBLIC',
        ...(category ? { category } : {}),
        ...(isShort !== undefined ? { isShort } : {}),
      },
      select: {
        id: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        hlsUrl: true,
        filePath: true,
        likeCount: true,
        commentCount: true,
        viewCount: true,
        duration: true,
        isShort: true,
        status: true,
        category: true,
        tags: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
      },
      orderBy: sortBy === 'popular'
        ? { viewCount: 'desc' }
        : { createdAt: 'desc' },
    });
  }

  async findOne(id: string, ip?: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        filePath: true,
        hlsUrl: true,
        thumbnailUrl: true,
        likeCount: true,
        commentCount: true,
        viewCount: true,
        duration: true,
        isShort: true,
        status: true,
        category: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true } },
      },
    });

    if (!video) throw new NotFoundException('Video not found');

    // Increment view count in the background — don't await so response is fast
    if (ip && video.status === 'READY') {
      this.incrementViewCount(id, ip).catch(() => {});
    }

    return video;
  }

  async remove(id: string, userId: string) {
    const video = await this.prisma.video.findUnique({ where: { id } });

    if (!video) throw new NotFoundException('Video not found');

    // Only the owner can delete their video
    if (video.userId !== userId) {
      throw new ForbiddenException('You can only delete your own videos');
    }

    await this.prisma.video.delete({ where: { id } });
    return { message: 'Video deleted successfully' };
  }

  async update(id: string, userId: string, dto: UpdateVideoDto) {
    const video = await this.prisma.video.findUnique({ where: { id } });

    if (!video) throw new NotFoundException('Video not found');

    // Only the owner can update their video
    if (video.userId !== userId) {
      throw new ForbiddenException('You can only edit your own videos');
    }

    return this.prisma.video.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
      },
      select: {
        id: true,
        title: true,
        description: true,
        filePath: true,
        thumbnailUrl: true,
        hlsUrl: true,
        viewCount: true,
        likeCount: true,
        commentCount: true,
        duration: true,
        isShort: true,
        status: true,
        category: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true } },
      },
    });
  }

  async upload(
    dto: UploadVideoDto,
    userId: string,
    file?: Express.Multer.File,
  ) {
    // Create the video record immediately with PROCESSING status
    const video = await this.prisma.video.create({
      data: {
        title: dto.title,
        description: dto.description,
        filePath: file?.path ?? null,
        userId,
        status: 'PROCESSING',
        category: dto.category,
        tags: dto.tags ?? [],
        visibility: dto.visibility ?? 'PUBLIC',
      },
    });

    // If a file was uploaded, add a compression job to the queue
    // The processor will update status to READY or FAILED when done
    if (file) {
      await this.videoQueue.add('compress', {
        videoId: video.id,
        filePath: file.path,
      });
    } else {
      // No file — mark as ready immediately (useful for testing)
      await this.prisma.video.update({
        where: { id: video.id },
        data: { status: 'READY' },
      });
    }

    // Return immediately — client polls GET /videos/:id to check status
    return {
      id: video.id,
      title: video.title,
      status: video.status,
      message: file ? 'Video uploaded and queued for processing' : 'Video created',
    };
  }

  async getTrending(limit = 20) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return this.prisma.video.findMany({
      where: {
        status: 'READY',
        isShort: false,  // Shorts have their own trending
        createdAt: { gte: sevenDaysAgo },
      },
      take: limit,
      orderBy: { viewCount: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        hlsUrl: true,
        filePath: true,
        likeCount: true,
        commentCount: true,
        viewCount: true,
        duration: true,
        isShort: true,
        status: true,
        category: true,
        tags: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
      },
    });
  }

  async getRelated(id: string, limit = 8) {
    // Get the current video to find its category, tags, and creator
    const current = await this.prisma.video.findUnique({
      where: { id },
      select: { userId: true, category: true, tags: true },
    });

    if (!current) throw new NotFoundException('Video not found');

    const videoSelect = {
      id: true,
      title: true,
      thumbnailUrl: true,
      filePath: true,
      duration: true,
      isShort: true,
      viewCount: true,
      category: true,
      tags: true,
      createdAt: true,
      user: { select: { id: true, name: true } },
    };

    // 1. Same category (excluding current video and same creator)
    const byCategoryPromise = current.category
      ? this.prisma.video.findMany({
          where: { id: { not: id }, status: 'READY', category: current.category },
          take: Math.ceil(limit / 2),
          orderBy: { viewCount: 'desc' },
          select: videoSelect,
        })
      : Promise.resolve([]);

    // 2. Same creator
    const byCreatorPromise = this.prisma.video.findMany({
      where: { id: { not: id }, status: 'READY', userId: current.userId },
      take: Math.ceil(limit / 3),
      orderBy: { createdAt: 'desc' },
      select: videoSelect,
    });

    // 3. Recent fallback
    const recentPromise = this.prisma.video.findMany({
      where: { id: { not: id }, status: 'READY' },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: videoSelect,
    });

    const [byCategory, byCreator, recent] = await Promise.all([
      byCategoryPromise, byCreatorPromise, recentPromise,
    ]);

    // Merge and deduplicate, prioritising category > creator > recent
    const seen = new Set<string>([id]);
    const results: typeof recent = [];

    for (const v of [...byCategory, ...byCreator, ...recent]) {
      if (!seen.has(v.id) && results.length < limit) {
        seen.add(v.id);
        results.push(v);
      }
    }

    return results;
  }

  async uploadThumbnail(videoId: string, userId: string, thumbnailPath: string) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');
    if (video.userId !== userId) throw new ForbiddenException('Not your video');

    return this.prisma.video.update({
      where: { id: videoId },
      data: { thumbnailUrl: thumbnailPath },
      select: { id: true, thumbnailUrl: true },
    });
  }

  async getStatus(id: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      select: { id: true, title: true, status: true, filePath: true },
    });
    if (!video) throw new NotFoundException('Video not found');
    return video;
  }

  /** Recover stuck PROCESSING videos — marks them READY so they appear on the home page */
  async recoverStuckVideos() {
    const result = await this.prisma.video.updateMany({
      where: { status: 'PROCESSING' },
      data: { status: 'READY' },
    });
    return { recovered: result.count };
  }

  /** Backfill isShort for existing videos — probes each file and sets isShort based on aspect ratio + duration */
  async backfillShorts() {
    const videos = await this.prisma.video.findMany({
      where: { status: 'READY', isShort: false },
      select: { id: true, filePath: true, hlsUrl: true, duration: true },
    });

    let updated = 0;
    let skipped = 0;

    for (const video of videos) {
      const filePath = video.filePath;
      if (!filePath) { skipped++; continue; }

      try {
        const info = await this.ffmpeg.getVideoInfo(filePath);
        const isShort = info.height > info.width && info.duration <= 60;
        if (isShort) {
          await this.prisma.video.update({
            where: { id: video.id },
            data: {
              isShort: true,
              duration: info.duration || video.duration || undefined,
            },
          });
          updated++;
        }
      } catch {
        skipped++;
      }
    }

    return { total: videos.length, updated, skipped };
  }

  async recordWatch(videoId: string, userId: string, progress?: number) {
    // Get video duration to calculate if completed
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: { duration: true },
    });

    if (!video) throw new NotFoundException('Video not found');

    const completed = progress && video.duration 
      ? progress >= video.duration * 0.9  // 90% watched = completed
      : false;

    // Upsert — creates entry or updates watchedAt + progress if already exists
    await this.prisma.watchHistory.upsert({
      where: { userId_videoId: { userId, videoId } },
      create: { 
        userId, 
        videoId, 
        progress: progress ?? 0,
        completed,
      },
      update: { 
        watchedAt: new Date(),
        progress: progress ?? 0,
        completed,
      },
    });
    return { message: 'Watch recorded', progress, completed };
  }

  async getProgress(videoId: string, userId: string) {
    const history = await this.prisma.watchHistory.findUnique({
      where: { userId_videoId: { userId, videoId } },
      select: { progress: true, completed: true },
    });

    return history ?? { progress: 0, completed: false };
  }

  async getChapters(videoId: string) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');

    return this.prisma.videoChapter.findMany({
      where: { videoId },
      orderBy: { position: 'asc' },
      select: { id: true, title: true, startTime: true, position: true },
    });
  }

  async setChapters(videoId: string, userId: string, dto: SetChaptersDto) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');
    if (video.userId !== userId) throw new ForbiddenException('Not your video');

    // Sort by startTime, assign positions, replace all existing chapters atomically
    const sorted = [...dto.chapters].sort((a, b) => a.startTime - b.startTime);

    await this.prisma.$transaction([
      this.prisma.videoChapter.deleteMany({ where: { videoId } }),
      this.prisma.videoChapter.createMany({
        data: sorted.map((c, i) => ({
          videoId,
          title: c.title,
          startTime: c.startTime,
          position: i,
        })),
      }),
    ]);

    return this.getChapters(videoId);
  }

  async getSubtitles(videoId: string) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');

    return this.prisma.videoSubtitle.findMany({
      where: { videoId },
      select: { id: true, language: true, label: true, filePath: true },
    });
  }

  async addSubtitle(videoId: string, userId: string, dto: UploadSubtitleDto, filePath: string) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');
    if (video.userId !== userId) throw new ForbiddenException('Not your video');

    return this.prisma.videoSubtitle.create({
      data: { videoId, language: dto.language, label: dto.label, filePath },
      select: { id: true, language: true, label: true, filePath: true },
    });
  }

  async removeSubtitle(videoId: string, subtitleId: string, userId: string) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');
    if (video.userId !== userId) throw new ForbiddenException('Not your video');

    await this.prisma.videoSubtitle.deleteMany({ where: { id: subtitleId, videoId } });
    return { message: 'Subtitle removed' };
  }
}

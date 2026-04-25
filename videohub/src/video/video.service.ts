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

  async findAll(category?: string, sortBy: 'newest' | 'popular' = 'newest') {
    return this.prisma.video.findMany({
      where: {
        status: 'READY',
        ...(category ? { category } : {}),
      },
      select: {
        id: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        hlsUrl: true,
        likeCount: true,
        commentCount: true,
        viewCount: true,
        duration: true,
        status: true,
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
        status: true,
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
      },
      select: {
        id: true,
        title: true,
        description: true,
        filePath: true,
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
        // category and tags will be enabled after npx prisma db push + prisma generate
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
        likeCount: true,
        commentCount: true,
        viewCount: true,
        duration: true,
        status: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
      },
    });
  }

  async getRelated(id: string, limit = 8) {
    // Get the current video to find its creator
    const current = await this.prisma.video.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!current) throw new NotFoundException('Video not found');

    // Return other READY videos — prioritise same creator, then recent
    return this.prisma.video.findMany({
      where: {
        id: { not: id },       // exclude current video
        status: 'READY',
      },
      take: limit,
      orderBy: [
        // Videos from the same creator come first
        { userId: current.userId ? 'asc' : 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        duration: true,
        viewCount: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
      },
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

  async recordWatch(videoId: string, userId: string) {
    // Upsert — creates entry or updates watchedAt if already exists
    await this.prisma.watchHistory.upsert({
      where: { userId_videoId: { userId, videoId } },
      create: { userId, videoId },
      update: { watchedAt: new Date() },
    });
    return { message: 'Watch recorded' };
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
}

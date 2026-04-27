import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class LikeService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService,
  ) {}

  async like(videoId: string, userId: string) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');

    const existing = await this.prisma.like.findUnique({
      where: { userId_videoId: { userId, videoId } },
    });
    if (existing) throw new ConflictException('Video already liked');

    await this.prisma.$transaction([
      this.prisma.like.create({ data: { userId, videoId } }),
      this.prisma.video.update({
        where: { id: videoId },
        data: { likeCount: { increment: 1 } },
      }),
    ]);

    // Notify the video owner (fire-and-forget — don't await)
    this.notifications.create(video.userId, userId, 'VIDEO_LIKED', videoId);

    return { message: 'Video liked', videoId };
  }

  async unlike(videoId: string, userId: string) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');

    const existing = await this.prisma.like.findUnique({
      where: { userId_videoId: { userId, videoId } },
    });
    if (!existing) throw new NotFoundException('Like not found');

    await this.prisma.$transaction([
      this.prisma.like.delete({ where: { userId_videoId: { userId, videoId } } }),
      this.prisma.video.update({
        where: { id: videoId },
        data: { likeCount: { decrement: 1 } },
      }),
    ]);

    return { message: 'Video unliked', videoId };
  }

  async isLiked(videoId: string, userId: string): Promise<{ liked: boolean }> {
    const record = await this.prisma.like.findUnique({
      where: { userId_videoId: { userId, videoId } },
    });
    return { liked: !!record };
  }
}

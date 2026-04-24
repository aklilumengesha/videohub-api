import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LikeService {
  constructor(private prisma: PrismaService) {}

  async like(videoId: string, userId: string) {
    // Verify video exists
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');

    // Check if already liked
    const existing = await this.prisma.like.findUnique({
      where: { userId_videoId: { userId, videoId } },
    });
    if (existing) throw new ConflictException('Video already liked');

    // Use transaction: create like + increment counter atomically
    await this.prisma.$transaction([
      this.prisma.like.create({
        data: { userId, videoId },
      }),
      this.prisma.video.update({
        where: { id: videoId },
        data: { likeCount: { increment: 1 } },
      }),
    ]);

    return { message: 'Video liked', videoId };
  }

  async unlike(videoId: string, userId: string) {
    // Verify video exists
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');

    // Check if like exists
    const existing = await this.prisma.like.findUnique({
      where: { userId_videoId: { userId, videoId } },
    });
    if (!existing) throw new NotFoundException('Like not found');

    // Use transaction: delete like + decrement counter atomically
    await this.prisma.$transaction([
      this.prisma.like.delete({
        where: { userId_videoId: { userId, videoId } },
      }),
      this.prisma.video.update({
        where: { id: videoId },
        data: { likeCount: { decrement: 1 } },
      }),
    ]);

    return { message: 'Video unliked', videoId };
  }
}

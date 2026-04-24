import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const videoSelect = {
  id: true,
  title: true,
  description: true,
  filePath: true,
  likeCount: true,
  commentCount: true,
  createdAt: true,
  user: { select: { id: true, name: true } },
};

@Injectable()
export class FeedService {
  constructor(private prisma: PrismaService) {}

  // Personalized feed — videos from users the current user follows
  async getPersonalizedFeed(userId: string, cursor?: string, limit = 20) {
    // Get list of users this person follows
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = following.map((f) => f.followingId);

    // If not following anyone, return empty feed
    if (followingIds.length === 0) return [];

    return this.prisma.video.findMany({
      where: {
        userId: { in: followingIds },
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: videoSelect,
    });
  }

  // Explore feed — all videos for non-authenticated or new users
  async getExploreFeed(cursor?: string, limit = 20) {
    return this.prisma.video.findMany({
      where: {
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: videoSelect,
    });
  }
}

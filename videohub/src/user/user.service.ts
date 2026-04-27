import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async updateAvatar(userId: string, avatarPath: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: avatarPath },
      select: { id: true, name: true, email: true, bio: true, avatarUrl: true, createdAt: true, updatedAt: true },
    });
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getPublicProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getUserVideos(userId: string) {
    // Verify user exists first
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.video.findMany({
      where: { userId },
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
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async getHistory(userId: string, cursor?: string, limit = 20) {
    const items = await this.prisma.watchHistory.findMany({
      where: { userId },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { userId_videoId: { userId, videoId: cursor } } } : {}),
      orderBy: { watchedAt: 'desc' },
      select: {
        watchedAt: true,
        video: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            duration: true,
            viewCount: true,
            createdAt: true,
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? data[data.length - 1].video.id : null;

    return { items: data, nextCursor };
  }

  async clearHistory(userId: string) {
    await this.prisma.watchHistory.deleteMany({ where: { userId } });
    return { message: 'Watch history cleared' };
  }
}

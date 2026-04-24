import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FollowService {
  constructor(private prisma: PrismaService) {}

  async follow(followingId: string, followerId: string) {
    // Cannot follow yourself
    if (followerId === followingId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    // Verify target user exists
    const target = await this.prisma.user.findUnique({ where: { id: followingId } });
    if (!target) throw new NotFoundException('User not found');

    // Check if already following
    const existing = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (existing) throw new ConflictException('Already following this user');

    await this.prisma.follow.create({
      data: { followerId, followingId },
    });

    return { message: 'Now following', followingId };
  }

  async unfollow(followingId: string, followerId: string) {
    const existing = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (!existing) throw new NotFoundException('Not following this user');

    await this.prisma.follow.delete({
      where: { followerId_followingId: { followerId, followingId } },
    });

    return { message: 'Unfollowed', followingId };
  }

  async getFollowers(userId: string, cursor?: string, limit = 20) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.follow.findMany({
      where: {
        followingId: userId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        follower: { select: { id: true, name: true, bio: true } },
      },
    });
  }

  async getFollowing(userId: string, cursor?: string, limit = 20) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.follow.findMany({
      where: {
        followerId: userId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        following: { select: { id: true, name: true, bio: true } },
      },
    });
  }
}

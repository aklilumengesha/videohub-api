import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async searchVideos(q: string, cursor?: string, limit = 20, uploadDate?: string, sortBy?: string) {
    if (!q || q.trim().length < 2) {
      throw new BadRequestException('Search query must be at least 2 characters');
    }

    // Build date filter
    let dateFilter: { gte?: Date } = {};
    if (uploadDate) {
      const now = new Date();
      const cutoffs: Record<string, Date> = {
        today: new Date(now.setHours(0, 0, 0, 0)),
        week:  new Date(Date.now() - 7 * 86400000),
        month: new Date(Date.now() - 30 * 86400000),
        year:  new Date(Date.now() - 365 * 86400000),
      };
      if (cutoffs[uploadDate]) dateFilter = { gte: cutoffs[uploadDate] };
    }

    // Build sort order
    const orderBy: Record<string, string>[] =
      sortBy === 'views'  ? [{ viewCount: 'desc' }] :
      sortBy === 'date'   ? [{ createdAt: 'desc' }] :
      /* relevance */       [{ viewCount: 'desc' }, { createdAt: 'desc' }];

    return this.prisma.video.findMany({
      where: {
        status: 'READY',
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
        ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      take: limit,
      orderBy,
      select: {
        id: true,
        title: true,
        description: true,
        filePath: true,
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

  async searchUsers(q: string, cursor?: string, limit = 20) {
    if (!q || q.trim().length < 2) {
      throw new BadRequestException('Search query must be at least 2 characters');
    }

    return this.prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { bio: { contains: q, mode: 'insensitive' } },
        ],
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
  }
}

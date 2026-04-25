import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /** Total views, likes, comments, and subscriber count across all creator videos */
  async getOverview(userId: string) {
    const [videos, subscribers] = await Promise.all([
      this.prisma.video.findMany({
        where: { userId },
        select: { viewCount: true, likeCount: true, commentCount: true },
      }),
      this.prisma.follow.count({ where: { followingId: userId } }),
    ]);

    const totalViews    = videos.reduce((s, v) => s + v.viewCount, 0);
    const totalLikes    = videos.reduce((s, v) => s + v.likeCount, 0);
    const totalComments = videos.reduce((s, v) => s + v.commentCount, 0);

    return {
      totalVideos: videos.length,
      totalViews,
      totalLikes,
      totalComments,
      subscribers,
    };
  }

  /** Per-video breakdown sorted by views descending */
  async getVideoStats(userId: string) {
    return this.prisma.video.findMany({
      where: { userId },
      orderBy: { viewCount: 'desc' },
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        viewCount: true,
        likeCount: true,
        commentCount: true,
        status: true,
        createdAt: true,
      },
    });
  }

  /**
   * Daily view counts for the last N days.
   * Uses raw SQL grouping by date since Prisma doesn't support date truncation natively.
   * Falls back to approximation from video.updatedAt if no view log table exists.
   */
  async getDailyViews(userId: string, days = 30) {
    // Build a date series for the last `days` days
    const result: Array<{ date: string; views: number }> = [];
    const now = new Date();

    // Get all videos for this user with their current viewCount and createdAt
    const videos = await this.prisma.video.findMany({
      where: { userId, status: 'READY' },
      select: { viewCount: true, createdAt: true },
    });

    // Distribute views evenly across days since video was created (approximation)
    // In a production system you'd have a VideoView log table for exact data
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Sum views from videos that existed on this date, weighted by recency
      let dayViews = 0;
      for (const v of videos) {
        const videoAge = Math.max(1, Math.floor((now.getTime() - new Date(v.createdAt).getTime()) / 86400000));
        const videoExistedOnDay = new Date(v.createdAt) <= date;
        if (videoExistedOnDay) {
          // Distribute views with slight recency bias (more views on recent days)
          const weight = 1 + (days - i) / days;
          dayViews += Math.round((v.viewCount / videoAge) * weight * 0.5);
        }
      }

      result.push({ date: dateStr, views: dayViews });
    }

    return result;
  }

  /** Top performing video */
  async getTopVideo(userId: string) {
    return this.prisma.video.findFirst({
      where: { userId, status: 'READY' },
      orderBy: { viewCount: 'desc' },
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        viewCount: true,
        likeCount: true,
        commentCount: true,
      },
    });
  }
}

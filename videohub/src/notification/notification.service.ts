import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SseService } from '../sse/sse.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private sse: SseService,
  ) {}

  // Called internally by like/follow/comment services
  async create(userId: string, actorId: string, type: NotificationType, videoId?: string) {
    // Don't notify yourself
    if (userId === actorId) return;

    const notification = await this.prisma.notification.create({
      data: { userId, actorId, type, videoId },
      select: {
        id: true,
        type: true,
        read: true,
        videoId: true,
        createdAt: true,
        actor: { select: { id: true, name: true } },
      },
    });

    // Push real-time event to the recipient if they're connected
    this.sse.sendToUser(userId, { type: 'notification', data: notification });

    return notification;
  }

  async findAll(userId: string, cursor?: string, limit = 20) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        read: true,
        videoId: true,
        createdAt: true,
        actor: { select: { id: true, name: true } },
      },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { message: 'All notifications marked as read' };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, read: false },
    });
    return { count };
  }
}

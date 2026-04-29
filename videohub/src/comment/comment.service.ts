import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class CommentService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService,
  ) {}

  async create(videoId: string, userId: string, dto: CreateCommentDto) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');

    const [comment] = await this.prisma.$transaction([
      this.prisma.comment.create({
        data: { content: dto.content, userId, videoId },
        select: {
          id: true,
          content: true,
          likeCount: true,
          isPinned: true,
          isHearted: true,
          createdAt: true,
          user: { select: { id: true, name: true, avatarUrl: true } },
          _count: { select: { replies: true } },
        },
      }),
      this.prisma.video.update({
        where: { id: videoId },
        data: { commentCount: { increment: 1 } },
      }),
    ]);

    // Notify the video owner (fire-and-forget)
    this.notifications.create(video.userId, userId, 'VIDEO_COMMENTED', videoId);

    return comment;
  }

  async findAll(videoId: string, cursor?: string, limit = 20, sort: 'top' | 'newest' = 'newest') {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');

    const orderBy = sort === 'top' 
      ? [{ isPinned: 'desc' as const }, { likeCount: 'desc' as const }]
      : [{ isPinned: 'desc' as const }, { createdAt: 'desc' as const }];

    return this.prisma.comment.findMany({
      where: {
        videoId,
        parentId: null,  // Only top-level comments
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      take: limit,
      orderBy,
      select: {
        id: true,
        content: true,
        likeCount: true,
        isPinned: true,
        isHearted: true,
        createdAt: true,
        user: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { replies: true } },
      },
    });
  }

  async reply(parentId: string, userId: string, dto: CreateCommentDto) {
    const parent = await this.prisma.comment.findUnique({ 
      where: { id: parentId },
      include: { video: true }
    });
    if (!parent) throw new NotFoundException('Comment not found');

    const reply = await this.prisma.comment.create({
      data: { 
        content: dto.content, 
        userId, 
        videoId: parent.videoId,
        parentId 
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Notify parent comment author
    if (parent.userId !== userId) {
      this.notifications.create(parent.userId, userId, 'VIDEO_COMMENTED', parent.videoId);
    }

    return reply;
  }

  async togglePin(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { video: true }
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.video.userId !== userId) {
      throw new ForbiddenException('Only video owner can pin comments');
    }

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { isPinned: !comment.isPinned },
    });

    return { isPinned: updated.isPinned };
  }

  async toggleHeart(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { video: true }
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.video.userId !== userId) {
      throw new ForbiddenException('Only video owner can heart comments');
    }

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { isHearted: !comment.isHearted },
    });

    return { isHearted: updated.isHearted };
  }

  async like(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');

    const existing = await this.prisma.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });
    if (existing) return { message: 'Already liked' };

    await this.prisma.$transaction([
      this.prisma.commentLike.create({ data: { userId, commentId } }),
      this.prisma.comment.update({ where: { id: commentId }, data: { likeCount: { increment: 1 } } }),
    ]);

    return { message: 'Comment liked' };
  }

  async unlike(commentId: string, userId: string) {
    const existing = await this.prisma.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });
    if (!existing) return { message: 'Not liked' };

    await this.prisma.$transaction([
      this.prisma.commentLike.delete({ where: { userId_commentId: { userId, commentId } } }),
      this.prisma.comment.update({ where: { id: commentId }, data: { likeCount: { decrement: 1 } } }),
    ]);

    return { message: 'Comment unliked' };
  }

  async remove(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { _count: { select: { replies: true } } }
    });

    if (!comment) throw new NotFoundException('Comment not found');

    // Only the comment author can delete it
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    // Delete comment and all replies
    await this.prisma.$transaction([
      this.prisma.comment.deleteMany({ where: { parentId: commentId } }),  // Delete replies
      this.prisma.comment.delete({ where: { id: commentId } }),
      this.prisma.video.update({
        where: { id: comment.videoId },
        data: { commentCount: { decrement: 1 + comment._count.replies } },
      }),
    ]);

    return { message: 'Comment deleted' };
  }

  async likeComment(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');

    const existing = await this.prisma.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });
    if (existing) throw new ConflictException('Comment already liked');

    await this.prisma.$transaction([
      this.prisma.commentLike.create({ data: { userId, commentId } }),
      this.prisma.comment.update({ where: { id: commentId }, data: { likeCount: { increment: 1 } } }),
    ]);

    return { message: 'Comment liked' };
  }

  async unlikeComment(commentId: string, userId: string) {
    const existing = await this.prisma.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });
    if (!existing) throw new NotFoundException('Like not found');

    await this.prisma.$transaction([
      this.prisma.commentLike.delete({ where: { userId_commentId: { userId, commentId } } }),
      this.prisma.comment.update({ where: { id: commentId }, data: { likeCount: { decrement: 1 } } }),
    ]);

    return { message: 'Comment unliked' };
  }
}

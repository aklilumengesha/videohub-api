import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentService {
  constructor(private prisma: PrismaService) {}

  async create(videoId: string, userId: string, dto: CreateCommentDto) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');

    // Use transaction: create comment + increment commentCount atomically
    const [comment] = await this.prisma.$transaction([
      this.prisma.comment.create({
        data: { content: dto.content, userId, videoId },
        select: {
          id: true,
          content: true,
          createdAt: true,
          user: { select: { id: true, name: true } },
        },
      }),
      this.prisma.video.update({
        where: { id: videoId },
        data: { commentCount: { increment: 1 } },
      }),
    ]);

    return comment;
  }

  async findAll(videoId: string, cursor?: string, limit = 20) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');

    return this.prisma.comment.findMany({
      where: {
        videoId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
      },
    });
  }

  async remove(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) throw new NotFoundException('Comment not found');

    // Only the comment author can delete it
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    // Use transaction: delete comment + decrement commentCount atomically
    await this.prisma.$transaction([
      this.prisma.comment.delete({ where: { id: commentId } }),
      this.prisma.video.update({
        where: { id: comment.videoId },
        data: { commentCount: { decrement: 1 } },
      }),
    ]);

    return { message: 'Comment deleted' };
  }
}

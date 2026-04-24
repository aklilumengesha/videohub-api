import { Injectable } from '@nestjs/common';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { FfmpegService } from './ffmpeg.service';
import { UploadVideoDto } from './dto/upload-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { VIDEO_PROCESSING_QUEUE } from './video.constants';

@Injectable()
export class VideoService {
  constructor(
    private prisma: PrismaService,
    private ffmpeg: FfmpegService,
    @InjectQueue(VIDEO_PROCESSING_QUEUE) private videoQueue: Queue,
  ) {}

  async findAll() {
    return this.prisma.video.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        filePath: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        filePath: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true } },
      },
    });

    if (!video) throw new NotFoundException('Video not found');
    return video;
  }

  async remove(id: string, userId: string) {
    const video = await this.prisma.video.findUnique({ where: { id } });

    if (!video) throw new NotFoundException('Video not found');

    // Only the owner can delete their video
    if (video.userId !== userId) {
      throw new ForbiddenException('You can only delete your own videos');
    }

    await this.prisma.video.delete({ where: { id } });
    return { message: 'Video deleted successfully' };
  }

  async update(id: string, userId: string, dto: UpdateVideoDto) {
    const video = await this.prisma.video.findUnique({ where: { id } });

    if (!video) throw new NotFoundException('Video not found');

    // Only the owner can update their video
    if (video.userId !== userId) {
      throw new ForbiddenException('You can only edit your own videos');
    }

    return this.prisma.video.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
      select: {
        id: true,
        title: true,
        description: true,
        filePath: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true } },
      },
    });
  }

  async upload(
    dto: UploadVideoDto,
    userId: string,
    file?: Express.Multer.File,
  ) {
    // Create the video record immediately with PROCESSING status
    const video = await this.prisma.video.create({
      data: {
        title: dto.title,
        description: dto.description,
        filePath: file?.path ?? null,
        userId,
        status: 'PROCESSING',
      },
    });

    // If a file was uploaded, add a compression job to the queue
    // The processor will update status to READY or FAILED when done
    if (file) {
      await this.videoQueue.add('compress', {
        videoId: video.id,
        filePath: file.path,
      });
    } else {
      // No file — mark as ready immediately (useful for testing)
      await this.prisma.video.update({
        where: { id: video.id },
        data: { status: 'READY' },
      });
    }

    // Return immediately — client polls GET /videos/:id to check status
    return {
      id: video.id,
      title: video.title,
      status: video.status,
      message: file ? 'Video uploaded and queued for processing' : 'Video created',
    };
  }

  async getStatus(id: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      select: { id: true, title: true, status: true, filePath: true },
    });
    if (!video) throw new NotFoundException('Video not found');
    return video;
  }
}

import { Injectable } from '@nestjs/common';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FfmpegService } from './ffmpeg.service';
import { UploadVideoDto } from './dto/upload-video.dto';

@Injectable()
export class VideoService {
  constructor(
    private prisma: PrismaService,
    private ffmpeg: FfmpegService,
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

  async upload(
    dto: UploadVideoDto,
    userId: string,
    file?: Express.Multer.File,
  ) {
    let filePath = `/uploads/placeholder.mp4`;

    if (file) {
      // Compress the uploaded video using ffmpeg
      try {
        const compressedPath = await this.ffmpeg.compress(file.path);
        filePath = compressedPath;
      } catch {
        // If ffmpeg fails (not installed), use original file
        filePath = file.path;
      }
    }

    return this.prisma.video.create({
      data: {
        title: dto.title,
        description: dto.description,
        filePath,
        userId,
      },
    });
  }
}

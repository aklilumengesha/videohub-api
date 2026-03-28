import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadVideoDto } from './dto/upload-video.dto';

@Injectable()
export class VideoService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    // Optimized query — only select needed fields, include user name
    return this.prisma.video.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        filePath: true,
        createdAt: true,
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upload(dto: UploadVideoDto, userId: string) {
    return this.prisma.video.create({
      data: {
        title: dto.title,
        description: dto.description,
        filePath: `/uploads/${Date.now()}.mp4`,
        userId,
      },
    });
  }
}

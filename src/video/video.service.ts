import { Injectable } from '@nestjs/common';
import { UploadVideoDto } from './dto/upload-video.dto';
import { VideoResponse } from './interfaces/video.interface';

@Injectable()
export class VideoService {
  // Temporary in-memory store until Prisma is added
  private videos: VideoResponse[] = [];

  findAll(): VideoResponse[] {
    return this.videos;
  }

  upload(dto: UploadVideoDto, userId: string): VideoResponse {
    const video: VideoResponse = {
      id: Date.now().toString(),
      title: dto.title,
      description: dto.description,
      filePath: `/uploads/${Date.now()}.mp4`,
      userId,
      createdAt: new Date(),
    };

    this.videos.push(video);
    return video;
  }
}

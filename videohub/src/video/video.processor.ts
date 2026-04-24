import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { FfmpegService } from './ffmpeg.service';
import { VIDEO_PROCESSING_QUEUE } from './video.constants';

export interface VideoJobData {
  videoId: string;
  filePath: string;
}

@Processor(VIDEO_PROCESSING_QUEUE)
export class VideoProcessor {
  private readonly logger = new Logger(VideoProcessor.name);

  constructor(
    private prisma: PrismaService,
    private ffmpeg: FfmpegService,
  ) {}

  @Process('compress')
  async handleCompress(job: Job<VideoJobData>) {
    const { videoId, filePath } = job.data;
    this.logger.log(`Processing video ${videoId} from ${filePath}`);

    try {
      // Run FFmpeg compression in the background
      const compressedPath = await this.ffmpeg.compress(filePath);

      // Update video record to READY with the compressed file path
      await this.prisma.video.update({
        where: { id: videoId },
        data: {
          filePath: compressedPath,
          status: 'READY',
        },
      });

      this.logger.log(`Video ${videoId} processing complete: ${compressedPath}`);
      return { videoId, compressedPath };
    } catch (error) {
      this.logger.error(`Video ${videoId} processing failed: ${(error as Error).message}`);

      // Mark video as FAILED so the client can show an error state
      await this.prisma.video.update({
        where: { id: videoId },
        data: { status: 'FAILED' },
      });

      // Re-throw so BullMQ marks the job as failed and can retry
      throw error;
    }
  }
}

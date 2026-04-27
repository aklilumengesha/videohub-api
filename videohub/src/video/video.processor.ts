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
    this.logger.log(`Processing video ${videoId}`);

    try {
      // Step 1 — Extract thumbnail (fast, do first so UI shows something quickly)
      let thumbnailUrl: string | null = null;
      try {
        thumbnailUrl = await this.ffmpeg.extractThumbnail(filePath, videoId);
        this.logger.log(`Thumbnail ready: ${thumbnailUrl}`);

        // Update thumbnail immediately so the UI can show it while encoding continues
        await this.prisma.video.update({
          where: { id: videoId },
          data: { thumbnailUrl },
        });
      } catch (thumbErr) {
        this.logger.warn(`Thumbnail extraction failed: ${(thumbErr as Error).message}`);
      }

      // Step 2 — Get video duration
      let duration: number | null = null;
      try {
        duration = await this.ffmpeg.getDuration(filePath);
      } catch {
        // non-fatal — duration is optional
      }

      // Step 3 — HLS multi-quality encoding (the main work)
      const { masterPlaylistPath } = await this.ffmpeg.encodeHls(filePath, videoId);

      // Step 4 — Mark video as READY with all metadata
      await this.prisma.video.update({
        where: { id: videoId },
        data: {
          hlsUrl: masterPlaylistPath,
          thumbnailUrl: thumbnailUrl ?? undefined,
          duration: duration ?? undefined,
          status: 'READY',
        },
      });

      this.logger.log(`Video ${videoId} processing complete`);
      return { videoId, masterPlaylistPath };

    } catch (error) {
      this.logger.warn(
        `FFmpeg processing failed for ${videoId}: ${(error as Error).message}. ` +
        `Falling back to original file — video will still be playable.`
      );

      // Graceful fallback: mark READY with the original uploaded file
      // This means no HLS/thumbnails but the video is still watchable
      await this.prisma.video.update({
        where: { id: videoId },
        data: {
          status: 'READY',
          // filePath already set on upload — keep it as the playback source
        },
      });

      return { videoId, fallback: true };
    }
  }
}

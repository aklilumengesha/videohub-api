import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { FfmpegService } from './ffmpeg.service';
import { VideoProcessor } from './video.processor';
import { AuthModule } from '../auth/auth.module';
import { VIDEO_PROCESSING_QUEUE } from './video.constants';

@Module({
  imports: [
    AuthModule,
    // Register the queue — makes InjectQueue available in VideoService
    BullModule.registerQueue({
      name: VIDEO_PROCESSING_QUEUE,
    }),
  ],
  controllers: [VideoController],
  providers: [VideoService, FfmpegService, VideoProcessor],
})
export class VideoModule {}

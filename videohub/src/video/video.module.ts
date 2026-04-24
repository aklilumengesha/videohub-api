import { Module } from '@nestjs/common';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { FfmpegService } from './ffmpeg.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [VideoController],
  providers: [VideoService, FfmpegService],
})
export class VideoModule {}

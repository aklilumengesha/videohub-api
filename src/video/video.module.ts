import { Module } from '@nestjs/common';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // Needed so JwtAuthGuard can use JwtStrategy
  controllers: [VideoController],
  providers: [VideoService],
})
export class VideoModule {}

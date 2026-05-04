import { Module } from '@nestjs/common';
import { LikeController, DislikeController, LikedVideosController } from './like.controller';
import { LikeService } from './like.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [LikeController, DislikeController, LikedVideosController],
  providers: [LikeService],
})
export class LikeModule {}

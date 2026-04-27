import { Module } from '@nestjs/common';
import { LikeController, DislikeController } from './like.controller';
import { LikeService } from './like.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [LikeController, DislikeController],
  providers: [LikeService],
})
export class LikeModule {}

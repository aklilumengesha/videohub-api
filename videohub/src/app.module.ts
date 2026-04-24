import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { VideoModule } from './video/video.module';
import { LikeModule } from './like/like.module';
import { CommentModule } from './comment/comment.module';
import { FollowModule } from './follow/follow.module';
import { FeedModule } from './feed/feed.module';

@Module({
  imports: [
    // BullModule — connects to Redis for job queues
    BullModule.forRoot({
      redis: process.env.REDIS_URL ?? 'redis://localhost:6379',
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    VideoModule,
    LikeModule,
    CommentModule,
    FollowModule,
    FeedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

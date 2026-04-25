import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
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
import { SearchModule } from './search/search.module';
import { NotificationModule } from './notification/notification.module';
import { HealthModule } from './health/health.module';
import { PlaylistModule } from './playlist/playlist.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    // Serve the uploads folder as static files
    // HLS segments:   GET /uploads/hls/<videoId>/master.m3u8
    // Thumbnails:     GET /uploads/thumbnails/<videoId>.jpg
    // Raw uploads:    GET /uploads/<filename>
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        setHeaders: (res) => {
          // Required for HLS — allows the browser to fetch segments cross-origin
          res.setHeader('Access-Control-Allow-Origin', '*');
          // Cache segments for 1 hour, playlists for 5 seconds
          res.setHeader('Cache-Control', 'public, max-age=3600');
        },
      },
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
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
    SearchModule,
    NotificationModule,
    HealthModule,
    PlaylistModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

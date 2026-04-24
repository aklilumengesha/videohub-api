import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { VideoModule } from './video/video.module';
import { LikeModule } from './like/like.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UserModule,
    VideoModule,
    LikeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

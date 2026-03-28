import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { VideoService } from './video.service';
import { UploadVideoDto } from './dto/upload-video.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('videos')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  // GET /videos — public, no auth needed
  @Get()
  findAll() {
    return this.videoService.findAll();
  }

  // POST /videos/upload — protected, requires valid JWT
  @UseGuards(JwtAuthGuard)
  @Post('upload')
  upload(@Body() dto: UploadVideoDto, @Request() req: { user: { userId: string; email: string } }) {
    return this.videoService.upload(dto, req.user.userId);
  }
}

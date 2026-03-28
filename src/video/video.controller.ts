import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VideoService } from './video.service';
import { UploadVideoDto } from './dto/upload-video.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('videos')
@Controller('videos')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @ApiOperation({ summary: 'Get all videos' })
  @ApiResponse({ status: 200, description: 'Returns list of all videos' })
  @Get()
  findAll() {
    return this.videoService.findAll();
  }

  @ApiOperation({ summary: 'Upload a new video (requires auth)' })
  @ApiResponse({ status: 201, description: 'Video uploaded successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiBearerAuth()  // Shows lock icon in Swagger UI
  @UseGuards(JwtAuthGuard)
  @Post('upload')
  upload(
    @Body() dto: UploadVideoDto,
    @Request() req: { user: { userId: string; email: string } },
  ) {
    return this.videoService.upload(dto, req.user.userId);
  }
}

import {
  Controller, Get, Post, Put, Delete, Body, UseGuards, Request, Param,
  UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { VideoService } from './video.service';
import { UploadVideoDto } from './dto/upload-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { multerStorage, videoFileFilter, MAX_FILE_SIZE } from './multer.config';

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

  @ApiOperation({ summary: 'Get a single video by ID' })
  @ApiResponse({ status: 200, description: 'Returns the video' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.videoService.findOne(id);
  }

  @ApiOperation({ summary: 'Get video processing status' })
  @ApiResponse({ status: 200, description: 'Returns video id, title, status and filePath' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  @Get(':id/status')
  getStatus(@Param('id') id: string) {
    return this.videoService.getStatus(id);
  }

  @ApiOperation({ summary: 'Delete a video (owner only)' })
  @ApiResponse({ status: 200, description: 'Video deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — not the owner' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.videoService.remove(id, req.user.userId);
  }

  @ApiOperation({ summary: 'Update video title and description (owner only)' })
  @ApiResponse({ status: 200, description: 'Returns updated video' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — not the owner' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
    @Body() dto: UpdateVideoDto,
  ) {
    return this.videoService.update(id, req.user.userId, dto);
  }

  @ApiOperation({ summary: 'Upload a video file with metadata (requires auth)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        description: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Video uploaded and compressed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multerStorage,
      fileFilter: videoFileFilter,
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  @Post('upload')
  async upload(
    @Body() dto: UploadVideoDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE })],
        fileIsRequired: false, // Allow upload without file for testing
      }),
    )
    file: Express.Multer.File | undefined,
    @Request() req: { user: { userId: string; email: string } },
  ) {
    return this.videoService.upload(dto, req.user.userId, file);
  }
}

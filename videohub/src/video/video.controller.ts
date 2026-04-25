import {
  Controller, Get, Post, Put, Delete, Body, UseGuards, Request, Param, Ip, Query,
  UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { VideoService } from './video.service';
import { UploadVideoDto } from './dto/upload-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { SetChaptersDto } from './dto/set-chapters.dto';
import { UploadSubtitleDto } from './dto/upload-subtitle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { multerStorage, videoFileFilter, MAX_FILE_SIZE } from './multer.config';

@ApiTags('videos')
@Controller('videos')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @ApiOperation({ summary: 'Get all videos, optionally filtered by category' })
  @ApiResponse({ status: 200, description: 'Returns list of all videos' })
  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('sort') sort?: string,
  ) {
    const sortBy = sort === 'popular' ? 'popular' : 'newest';
    return this.videoService.findAll(category, sortBy);
  }

  @ApiOperation({ summary: 'Get a single video by ID' })
  @ApiResponse({ status: 200, description: 'Returns the video' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  @Get(':id')
  findOne(@Param('id') id: string, @Ip() ip: string) {
    return this.videoService.findOne(id, ip);
  }

  @ApiOperation({ summary: 'Get trending videos — most viewed in the last 7 days' })
  @ApiResponse({ status: 200, description: 'Returns trending videos' })
  @Get('trending')
  getTrending() {
    return this.videoService.getTrending();
  }

  @ApiOperation({ summary: 'Get related videos for a video' })
  @ApiResponse({ status: 200, description: 'Returns list of related videos' })
  @Get(':id/related')
  getRelated(@Param('id') id: string) {
    return this.videoService.getRelated(id);
  }

  @ApiOperation({ summary: 'Get video processing status' })
  @ApiResponse({ status: 200, description: 'Returns video id, title, status and filePath' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  @Get(':id/status')
  getStatus(@Param('id') id: string) {
    return this.videoService.getStatus(id);
  }

  @ApiOperation({ summary: 'Record a watch event for history (requires auth)' })
  @ApiResponse({ status: 200, description: 'Watch recorded' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/watch')
  recordWatch(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.videoService.recordWatch(id, req.user.userId);
  }

  @ApiOperation({ summary: 'Get chapters for a video' })
  @ApiResponse({ status: 200, description: 'Returns list of chapters' })
  @Get(':id/chapters')
  getChapters(@Param('id') id: string) {
    return this.videoService.getChapters(id);
  }

  @ApiOperation({ summary: 'Set chapters for a video (owner only) — replaces all existing' })
  @ApiResponse({ status: 200, description: 'Returns updated chapter list' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/chapters')
  setChapters(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
    @Body() dto: SetChaptersDto,
  ) {
    return this.videoService.setChapters(id, req.user.userId, dto);
  }

  @ApiOperation({ summary: 'Get subtitles for a video' })
  @ApiResponse({ status: 200, description: 'Returns list of subtitle tracks' })
  @Get(':id/subtitles')
  getSubtitles(@Param('id') id: string) {
    return this.videoService.getSubtitles(id);
  }

  @ApiOperation({ summary: 'Upload a VTT subtitle file for a video (owner only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = join('uploads', 'subtitles');
        mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        cb(null, `${Date.now()}${extname(file.originalname)}`);
      },
    }),
    fileFilter: (_req, file, cb) => {
      cb(null, file.originalname.endsWith('.vtt') || file.mimetype === 'text/vtt');
    },
  }))
  @Post(':id/subtitles')
  addSubtitle(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
    @Body() dto: UploadSubtitleDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.videoService.addSubtitle(id, req.user.userId, dto, file.path);
  }

  @ApiOperation({ summary: 'Remove a subtitle track (owner only)' })
  @ApiResponse({ status: 200, description: 'Subtitle removed' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id/subtitles/:subtitleId')
  removeSubtitle(
    @Param('id') id: string,
    @Param('subtitleId') subtitleId: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.videoService.removeSubtitle(id, subtitleId, req.user.userId);
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

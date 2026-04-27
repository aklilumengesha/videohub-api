import { Controller, Get, Post, Delete, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LikeService } from './like.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('likes')
@Controller('videos/:videoId/like')
export class LikeController {
  constructor(private readonly likeService: LikeService) {}

  @ApiOperation({ summary: 'Check if the current user has liked a video' })
  @ApiResponse({ status: 200, description: 'Returns { liked: boolean }' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  isLiked(
    @Param('videoId') videoId: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.likeService.isLiked(videoId, req.user.userId);
  }

  @ApiOperation({ summary: 'Like a video (requires auth)' })
  @ApiResponse({ status: 201, description: 'Video liked successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  @ApiResponse({ status: 409, description: 'Video already liked' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  like(
    @Param('videoId') videoId: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.likeService.like(videoId, req.user.userId);
  }

  @ApiOperation({ summary: 'Unlike a video (requires auth)' })
  @ApiResponse({ status: 200, description: 'Video unliked successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Like not found' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Delete()
  unlike(
    @Param('videoId') videoId: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.likeService.unlike(videoId, req.user.userId);
  }
}

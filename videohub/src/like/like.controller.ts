import { Controller, Get, Post, Delete, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LikeService } from './like.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('likes')
@Controller('videos/:videoId/like')
export class LikeController {
  constructor(private readonly likeService: LikeService) {}

  @ApiOperation({ summary: 'Check if the current user has liked a video' })
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

@ApiTags('dislikes')
@Controller('videos/:videoId/dislike')
export class DislikeController {
  constructor(private readonly likeService: LikeService) {}

  @ApiOperation({ summary: 'Check if the current user has disliked a video' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  isDisliked(
    @Param('videoId') videoId: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.likeService.isDisliked(videoId, req.user.userId);
  }

  @ApiOperation({ summary: 'Dislike a video (requires auth)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  dislike(
    @Param('videoId') videoId: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.likeService.dislike(videoId, req.user.userId);
  }

  @ApiOperation({ summary: 'Remove dislike from a video (requires auth)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Delete()
  undislike(
    @Param('videoId') videoId: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.likeService.undislike(videoId, req.user.userId);
  }
}

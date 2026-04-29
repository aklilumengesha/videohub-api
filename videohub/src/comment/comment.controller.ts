import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('comments')
@Controller()
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @ApiOperation({ summary: 'Add a comment to a video (requires auth)' })
  @ApiResponse({ status: 201, description: 'Comment created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('videos/:videoId/comments')
  create(
    @Param('videoId') videoId: string,
    @Request() req: { user: { userId: string } },
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentService.create(videoId, req.user.userId, dto);
  }

  @ApiOperation({ summary: 'Get comments for a video with cursor pagination' })
  @ApiResponse({ status: 200, description: 'Returns list of comments' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  @ApiQuery({ name: 'cursor', required: false, description: 'ISO date string for pagination' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of comments to return (default 20)' })
  @ApiQuery({ name: 'sort', required: false, description: 'Sort by: top or newest (default newest)' })
  @Get('videos/:videoId/comments')
  findAll(
    @Param('videoId') videoId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
  ) {
    return this.commentService.findAll(videoId, cursor, limit ? parseInt(limit) : 20, sort as 'top' | 'newest');
  }

  @ApiOperation({ summary: 'Reply to a comment (requires auth)' })
  @ApiResponse({ status: 201, description: 'Reply created' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('comments/:commentId/reply')
  reply(
    @Param('commentId') commentId: string,
    @Request() req: { user: { userId: string } },
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentService.reply(commentId, req.user.userId, dto);
  }

  @ApiOperation({ summary: 'Pin/unpin a comment (video owner only)' })
  @ApiResponse({ status: 200, description: 'Comment pinned/unpinned' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('comments/:commentId/pin')
  pin(
    @Param('commentId') commentId: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.commentService.togglePin(commentId, req.user.userId);
  }

  @ApiOperation({ summary: 'Heart/unheart a comment (video owner only)' })
  @ApiResponse({ status: 200, description: 'Comment hearted/unhearted' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('comments/:commentId/heart')
  heart(
    @Param('commentId') commentId: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.commentService.toggleHeart(commentId, req.user.userId);
  }

  @ApiOperation({ summary: 'Like a comment (requires auth)' })
  @ApiResponse({ status: 200, description: 'Comment liked' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('comments/:commentId/like')
  like(
    @Param('commentId') commentId: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.commentService.like(commentId, req.user.userId);
  }

  @ApiOperation({ summary: 'Unlike a comment (requires auth)' })
  @ApiResponse({ status: 200, description: 'Comment unliked' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('comments/:commentId/like')
  unlike(
    @Param('commentId') commentId: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.commentService.unlike(commentId, req.user.userId);
  }

  @ApiOperation({ summary: 'Delete a comment (owner only)' })
  @ApiResponse({ status: 200, description: 'Comment deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — not the author' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Delete('comments/:commentId')
  remove(
    @Param('commentId') commentId: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.commentService.remove(commentId, req.user.userId);
  }
}

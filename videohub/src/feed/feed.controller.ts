import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FeedService } from './feed.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('feed')
@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @ApiOperation({ summary: 'Get personalized feed from followed users (requires auth)' })
  @ApiResponse({ status: 200, description: 'Returns paginated feed of videos from followed users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'cursor', required: false, description: 'ISO date string — createdAt of last item' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of videos to return (default 20)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  getPersonalizedFeed(
    @Request() req: { user: { userId: string } },
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.feedService.getPersonalizedFeed(
      req.user.userId,
      cursor,
      limit ? parseInt(limit) : 20,
    );
  }

  @ApiOperation({ summary: 'Get explore feed — all videos, no auth required' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of all videos' })
  @ApiQuery({ name: 'cursor', required: false, description: 'ISO date string — createdAt of last item' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of videos to return (default 20)' })
  @Get('explore')
  getExploreFeed(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.feedService.getExploreFeed(cursor, limit ? parseInt(limit) : 20);
  }
}

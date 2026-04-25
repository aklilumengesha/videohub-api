import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @ApiOperation({ summary: 'Get channel overview stats' })
  @Get('overview')
  getOverview(@Request() req: { user: { userId: string } }) {
    return this.analyticsService.getOverview(req.user.userId);
  }

  @ApiOperation({ summary: 'Get per-video stats sorted by views' })
  @Get('videos')
  getVideoStats(@Request() req: { user: { userId: string } }) {
    return this.analyticsService.getVideoStats(req.user.userId);
  }

  @ApiOperation({ summary: 'Get daily view counts for the last N days (default 30)' })
  @Get('views')
  getDailyViews(
    @Request() req: { user: { userId: string } },
    @Query('days') days?: string,
  ) {
    return this.analyticsService.getDailyViews(req.user.userId, days ? parseInt(days) : 30);
  }

  @ApiOperation({ summary: 'Get top performing video' })
  @Get('top-video')
  getTopVideo(@Request() req: { user: { userId: string } }) {
    return this.analyticsService.getTopVideo(req.user.userId);
  }
}

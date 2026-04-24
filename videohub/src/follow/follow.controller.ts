import { Controller, Post, Delete, Get, Param, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FollowService } from './follow.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('follows')
@Controller('users/:userId')
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  @ApiOperation({ summary: 'Follow a user (requires auth)' })
  @ApiResponse({ status: 201, description: 'Now following the user' })
  @ApiResponse({ status: 400, description: 'Cannot follow yourself' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Already following' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('follow')
  follow(
    @Param('userId') userId: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.followService.follow(userId, req.user.userId);
  }

  @ApiOperation({ summary: 'Unfollow a user (requires auth)' })
  @ApiResponse({ status: 200, description: 'Unfollowed the user' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Not following this user' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Delete('follow')
  unfollow(
    @Param('userId') userId: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.followService.unfollow(userId, req.user.userId);
  }

  @ApiOperation({ summary: 'Get followers of a user' })
  @ApiResponse({ status: 200, description: 'Returns list of followers' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Get('followers')
  getFollowers(
    @Param('userId') userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.followService.getFollowers(userId, cursor, limit ? parseInt(limit) : 20);
  }

  @ApiOperation({ summary: 'Get users that a user is following' })
  @ApiResponse({ status: 200, description: 'Returns list of following' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Get('following')
  getFollowing(
    @Param('userId') userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.followService.getFollowing(userId, cursor, limit ? parseInt(limit) : 20);
  }
}

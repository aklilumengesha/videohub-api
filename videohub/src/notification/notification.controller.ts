import { Controller, Get, Put, Param, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({ summary: 'Get notifications for current user' })
  @ApiResponse({ status: 200, description: 'Returns paginated notifications' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Get()
  findAll(
    @Request() req: { user: { userId: string } },
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationService.findAll(
      req.user.userId,
      cursor,
      limit ? parseInt(limit) : 20,
    );
  }

  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Returns unread count' })
  @Get('unread-count')
  getUnreadCount(@Request() req: { user: { userId: string } }) {
    return this.notificationService.getUnreadCount(req.user.userId);
  }

  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  @HttpCode(HttpStatus.OK)
  @Put('read-all')
  markAllRead(@Request() req: { user: { userId: string } }) {
    return this.notificationService.markAllRead(req.user.userId);
  }

  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @HttpCode(HttpStatus.OK)
  @Put(':id/read')
  markRead(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.notificationService.markRead(id, req.user.userId);
  }
}

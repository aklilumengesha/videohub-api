import { Controller, Get, Res, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { SseService } from './sse.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('sse')
@Controller('sse')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  @ApiOperation({ summary: 'Open a real-time SSE stream for the current user' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('events')
  stream(
    @Res() res: Response,
    @Request() req: { user: { userId: string } },
  ) {
    this.sseService.addClient(req.user.userId, res);
    // Response is kept open — NestJS must not close it automatically
  }
}

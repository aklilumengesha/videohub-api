import { Controller, Get, Post, Put, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { ReportVideoDto } from './dto/report-video.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';

@ApiTags('admin')
@Controller()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Public: any logged-in user can report a video ──────────────────────────

  @ApiOperation({ summary: 'Report a video for review' })
  @ApiResponse({ status: 201, description: 'Report submitted' })
  @ApiResponse({ status: 409, description: 'Already reported' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('videos/:id/report')
  reportVideo(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
    @Body() dto: ReportVideoDto,
  ) {
    return this.adminService.reportVideo(id, req.user.userId, dto);
  }

  // ── Admin-only endpoints ───────────────────────────────────────────────────

  @ApiOperation({ summary: 'Get platform stats (admin only)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/stats')
  getStats() {
    return this.adminService.getStats();
  }

  @ApiOperation({ summary: 'List reports (admin only)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/reports')
  getReports(@Query('status') status?: string) {
    return this.adminService.getReports(status);
  }

  @ApiOperation({ summary: 'Resolve or dismiss a report (admin only)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put('admin/reports/:id')
  resolveReport(
    @Param('id') id: string,
    @Body() dto: ResolveReportDto,
  ) {
    return this.adminService.resolveReport(id, dto);
  }
}

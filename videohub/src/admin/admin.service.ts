import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportVideoDto } from './dto/report-video.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';

const REPORT_SELECT = {
  id: true,
  reason: true,
  details: true,
  status: true,
  createdAt: true,
  user: { select: { id: true, name: true, email: true } },
  video: { select: { id: true, title: true, userId: true } },
};

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async reportVideo(videoId: string, userId: string, dto: ReportVideoDto) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');

    const existing = await this.prisma.videoReport.findUnique({
      where: { userId_videoId: { userId, videoId } },
    });
    if (existing) throw new ConflictException('You have already reported this video');

    await this.prisma.videoReport.create({
      data: { videoId, userId, reason: dto.reason, details: dto.details },
    });

    return { message: 'Report submitted. Thank you for keeping VideoHub safe.' };
  }

  async getReports(status?: string) {
    return this.prisma.videoReport.findMany({
      where: status ? { status: status as any } : {},
      orderBy: { createdAt: 'desc' },
      select: REPORT_SELECT,
    });
  }

  async resolveReport(reportId: string, dto: ResolveReportDto) {
    const report = await this.prisma.videoReport.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report not found');

    return this.prisma.videoReport.update({
      where: { id: reportId },
      data: { status: dto.status },
      select: REPORT_SELECT,
    });
  }

  async getStats() {
    const [users, videos, pendingReports, totalReports] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.video.count({ where: { status: 'READY' } }),
      this.prisma.videoReport.count({ where: { status: 'PENDING' } }),
      this.prisma.videoReport.count(),
    ]);

    return { users, videos, pendingReports, totalReports };
  }
}

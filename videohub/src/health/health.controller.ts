import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';

@ApiTags('health')
@SkipThrottle() // health checks should never be rate limited
@Controller('health')
export class HealthController {
  private redis: Redis;

  constructor(private prisma: PrismaService) {
    this.redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  }

  @ApiOperation({ summary: 'Check API, database, and Redis health' })
  @ApiResponse({ status: 200, description: 'All services healthy' })
  @ApiResponse({ status: 503, description: 'One or more services unhealthy' })
  @Get()
  async check() {
    const status = {
      api: 'ok',
      database: 'unknown',
      redis: 'unknown',
      timestamp: new Date().toISOString(),
    };

    // Check PostgreSQL via Prisma
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      status.database = 'ok';
    } catch {
      status.database = 'error';
    }

    // Check Redis
    try {
      await this.redis.ping();
      status.redis = 'ok';
    } catch {
      status.redis = 'error';
    }

    return status;
  }
}

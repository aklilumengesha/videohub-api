import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// PrismaService wraps PrismaClient and integrates with NestJS lifecycle
// OnModuleInit: connects to DB when app starts
// OnModuleDestroy: disconnects cleanly when app shuts down
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

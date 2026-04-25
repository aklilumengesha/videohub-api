import { Module, Global } from '@nestjs/common';
import { SseController } from './sse.controller';
import { SseService } from './sse.service';

// Global so any module can inject SseService without re-importing SseModule
@Global()
@Module({
  controllers: [SseController],
  providers: [SseService],
  exports: [SseService],
})
export class SseModule {}

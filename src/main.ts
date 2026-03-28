import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable global validation using class-validator decorators on DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // Strip unknown properties from request body
      forbidNonWhitelisted: true, // Throw error if unknown properties sent
      transform: true,       // Auto-transform payloads to DTO class instances
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

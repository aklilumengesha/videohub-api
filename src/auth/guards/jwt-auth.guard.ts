import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Applying this guard to any route will require a valid JWT token
// If token is missing or invalid, NestJS returns 401 Unauthorized automatically
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

import { Injectable, ForbiddenException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true, // gives us access to req so we can extract the raw token
    });
  }

  validate(req: Request, payload: { sub: string; email: string }) {
    // Extract the raw token from the Authorization header
    const authHeader = req.get('Authorization');
    if (!authHeader) throw new ForbiddenException('No token provided');

    const refreshToken = authHeader.replace('Bearer', '').trim();
    return { userId: payload.sub, email: payload.email, refreshToken };
  }
}

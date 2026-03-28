import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

// This payload is what we put INSIDE the JWT token when we sign it
export interface JwtPayload {
  sub: string;  // subject = user id
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // Extract token from Authorization: Bearer <token> header
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? 'fallback_secret',
    });
  }

  // This runs after token signature is verified
  // Whatever we return here gets attached to request.user
  validate(payload: JwtPayload) {
    return { userId: payload.sub, email: payload.email };
  }
}

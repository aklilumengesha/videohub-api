import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';

// In-memory user store (will be replaced by Prisma in Step 4)
interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  refreshToken?: string;
}

@Injectable()
export class AuthService {
  // Temporary in-memory store until we add Prisma
  private users: StoredUser[] = [];

  constructor(private jwtService: JwtService) {}

  async register(dto: RegisterUserDto) {
    // Check if email already exists
    const existing = this.users.find((u) => u.email === dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Hash password — never store plain text passwords
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user: StoredUser = {
      id: Date.now().toString(),
      name: dto.name,
      email: dto.email,
      passwordHash,
    };

    this.users.push(user);

    // Return tokens immediately after registration
    return this.generateTokens(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = this.users.find((u) => u.email === dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Compare plain password with stored hash
    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user.id, user.email);
  }

  private generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    // Access token — short lived (15 minutes)
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    });

    // Refresh token — long lived (7 days), used to get new access tokens
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    });

    return { accessToken, refreshToken };
  }
}

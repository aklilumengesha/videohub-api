import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
        // never return passwordHash or refreshToken
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getPublicProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        bio: true,
        createdAt: true,
        // email, passwordHash, refreshToken are private
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }
}

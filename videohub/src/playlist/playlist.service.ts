import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';

const VIDEO_SELECT = {
  id: true,
  title: true,
  thumbnailUrl: true,
  duration: true,
  viewCount: true,
  createdAt: true,
  user: { select: { id: true, name: true } },
};

@Injectable()
export class PlaylistService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreatePlaylistDto) {
    return this.prisma.playlist.create({
      data: {
        title: dto.title,
        description: dto.description,
        isPublic: dto.isPublic ?? true,
        userId,
      },
      select: { id: true, title: true, description: true, isPublic: true, createdAt: true },
    });
  }

  async getMyPlaylists(userId: string) {
    return this.prisma.playlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        isPublic: true,
        createdAt: true,
        _count: { select: { videos: true } },
      },
    });
  }

  async getOne(id: string, requesterId?: string) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        isPublic: true,
        createdAt: true,
        userId: true,
        user: { select: { id: true, name: true } },
        videos: {
          orderBy: { position: 'asc' },
          select: {
            position: true,
            addedAt: true,
            video: { select: VIDEO_SELECT },
          },
        },
      },
    });

    if (!playlist) throw new NotFoundException('Playlist not found');
    if (!playlist.isPublic && playlist.userId !== requesterId) {
      throw new ForbiddenException('This playlist is private');
    }

    return playlist;
  }

  async addVideo(playlistId: string, videoId: string, userId: string) {
    const playlist = await this.prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!playlist) throw new NotFoundException('Playlist not found');
    if (playlist.userId !== userId) throw new ForbiddenException('Not your playlist');

    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');

    // Get current max position
    const last = await this.prisma.playlistVideo.findFirst({
      where: { playlistId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    await this.prisma.playlistVideo.upsert({
      where: { playlistId_videoId: { playlistId, videoId } },
      create: { playlistId, videoId, position: (last?.position ?? -1) + 1 },
      update: {},  // already in playlist — no-op
    });

    return { message: 'Video added to playlist' };
  }

  async removeVideo(playlistId: string, videoId: string, userId: string) {
    const playlist = await this.prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!playlist) throw new NotFoundException('Playlist not found');
    if (playlist.userId !== userId) throw new ForbiddenException('Not your playlist');

    await this.prisma.playlistVideo.deleteMany({ where: { playlistId, videoId } });
    return { message: 'Video removed from playlist' };
  }

  async delete(playlistId: string, userId: string) {
    const playlist = await this.prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!playlist) throw new NotFoundException('Playlist not found');
    if (playlist.userId !== userId) throw new ForbiddenException('Not your playlist');

    await this.prisma.playlist.delete({ where: { id: playlistId } });
    return { message: 'Playlist deleted' };
  }

  async update(playlistId: string, userId: string, dto: { title?: string; description?: string; isPublic?: boolean }) {
    const playlist = await this.prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!playlist) throw new NotFoundException('Playlist not found');
    if (playlist.userId !== userId) throw new ForbiddenException('Not your playlist');

    return this.prisma.playlist.update({
      where: { id: playlistId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.isPublic !== undefined ? { isPublic: dto.isPublic } : {}),
      },
      select: { id: true, title: true, description: true, isPublic: true, createdAt: true },
    });
  }
}

import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PlaylistService } from './playlist.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('playlists')
@Controller('playlists')
export class PlaylistController {
  constructor(private readonly playlistService: PlaylistService) {}

  @ApiOperation({ summary: 'Create a new playlist' })
  @ApiResponse({ status: 201, description: 'Playlist created' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Request() req: { user: { userId: string } },
    @Body() dto: CreatePlaylistDto,
  ) {
    return this.playlistService.create(req.user.userId, dto);
  }

  @ApiOperation({ summary: 'Get all playlists for the current user' })
  @ApiResponse({ status: 200, description: 'Returns list of playlists' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyPlaylists(@Request() req: { user: { userId: string } }) {
    return this.playlistService.getMyPlaylists(req.user.userId);
  }

  @ApiOperation({ summary: 'Get a playlist by ID (public or owned)' })
  @ApiResponse({ status: 200, description: 'Returns playlist with videos' })
  @ApiResponse({ status: 404, description: 'Playlist not found' })
  @Get(':id')
  getOne(
    @Param('id') id: string,
    @Request() req: { user?: { userId: string } },
  ) {
    return this.playlistService.getOne(id, req.user?.userId);
  }

  @ApiOperation({ summary: 'Add a video to a playlist' })
  @ApiResponse({ status: 200, description: 'Video added' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/videos/:videoId')
  addVideo(
    @Param('id') id: string,
    @Param('videoId') videoId: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.playlistService.addVideo(id, videoId, req.user.userId);
  }

  @ApiOperation({ summary: 'Remove a video from a playlist' })
  @ApiResponse({ status: 200, description: 'Video removed' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id/videos/:videoId')
  removeVideo(
    @Param('id') id: string,
    @Param('videoId') videoId: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.playlistService.removeVideo(id, videoId, req.user.userId);
  }

  @ApiOperation({ summary: 'Delete a playlist' })
  @ApiResponse({ status: 200, description: 'Playlist deleted' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.playlistService.delete(id, req.user.userId);
  }

  @ApiOperation({ summary: 'Update playlist title/description/visibility' })
  @ApiResponse({ status: 200, description: 'Playlist updated' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
    @Body() dto: { title?: string; description?: string; isPublic?: boolean },
  ) {
    return this.playlistService.update(id, req.user.userId, dto);
  }
}

import { Controller, Get, Put, Post, Body, UseGuards, Request, Param, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Returns the current user profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Request() req: { user: { userId: string } }) {
    return this.userService.getMe(req.user.userId);
  }

  @ApiOperation({ summary: 'Update current user name and bio' })
  @ApiResponse({ status: 200, description: 'Returns updated user profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put('me')
  updateMe(
    @Request() req: { user: { userId: string } },
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.updateMe(req.user.userId, dto);
  }

  @ApiOperation({ summary: 'Get public profile of any user by ID' })
  @ApiResponse({ status: 200, description: 'Returns public user profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Get(':id')
  getPublicProfile(@Param('id') id: string) {
    return this.userService.getPublicProfile(id);
  }

  @ApiOperation({ summary: 'Upload avatar image for current user' })
  @ApiResponse({ status: 200, description: 'Returns updated user with avatarUrl' })
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = join('uploads', 'avatars');
        mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        cb(null, `${Date.now()}${extname(file.originalname)}`);
      },
    }),
  }))
  @Post('me/avatar')
  uploadAvatar(
    @Request() req: { user: { userId: string } },
    @UploadedFile(new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
        new FileTypeValidator({ fileType: /image\/(jpeg|png|webp|gif)/ }),
      ],
    })) file: Express.Multer.File,
  ) {
    return this.userService.updateAvatar(req.user.userId, file.path);
  }

  @ApiOperation({ summary: 'Get all videos uploaded by a user' })
  @ApiResponse({ status: 200, description: 'Returns list of user videos' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Get(':id/videos')
  getUserVideos(@Param('id') id: string) {
    return this.userService.getUserVideos(id);
  }
}

import { Controller, Get, Put, Body, UseGuards, Request, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
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

  @ApiOperation({ summary: 'Get all videos uploaded by a user' })
  @ApiResponse({ status: 200, description: 'Returns list of user videos' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Get(':id/videos')
  getUserVideos(@Param('id') id: string) {
    return this.userService.getUserVideos(id);
  }
}

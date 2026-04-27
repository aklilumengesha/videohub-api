import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @ApiOperation({ summary: 'Search videos by title or description' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'uploadDate', required: false, description: 'today | week | month | year' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'relevance | date | views' })
  @Get('videos')
  searchVideos(
    @Query('q') q: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('uploadDate') uploadDate?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    return this.searchService.searchVideos(q, cursor, limit ? parseInt(limit) : 20, uploadDate, sortBy);
  }

  @ApiOperation({ summary: 'Search users by name or bio' })
  @ApiResponse({ status: 200, description: 'Returns matching users' })
  @ApiResponse({ status: 400, description: 'Query too short' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query (min 2 chars)' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Get('users')
  searchUsers(
    @Query('q') q: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.searchUsers(q, cursor, limit ? parseInt(limit) : 20);
  }
}

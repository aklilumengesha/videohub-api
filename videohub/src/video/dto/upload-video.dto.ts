import { IsString, IsOptional, MinLength, MaxLength, IsArray, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const VIDEO_CATEGORIES = [
  'Gaming', 'Music', 'Education', 'Entertainment', 'Sports',
  'Technology', 'Travel', 'Food', 'Fashion', 'News', 'Other',
] as const;

export type VideoCategory = typeof VIDEO_CATEGORIES[number];

export class UploadVideoDto {
  @ApiProperty({ example: 'My First Video' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  title!: string;

  @ApiProperty({ example: 'A description of the video', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 'Education', required: false, enum: VIDEO_CATEGORIES })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ example: ['tutorial', 'react'], required: false, type: [String] })
  @IsArray()
  @IsOptional()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  tags?: string[];
}

import { IsString, IsOptional, MinLength, MaxLength, IsArray, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateVideoDto {
  @ApiProperty({ example: 'Updated title', required: false })
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(100)
  title?: string;

  @ApiProperty({ example: 'Updated description', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 'Gaming', required: false })
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

import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadVideoDto {
  @ApiProperty({ example: 'My First Video' })
  @IsString()
  @MinLength(3)
  title!: string;

  @ApiProperty({ example: 'A description of the video', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

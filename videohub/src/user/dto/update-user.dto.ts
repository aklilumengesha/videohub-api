import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ example: 'John Doe', required: false })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @ApiProperty({ example: 'Software developer and video creator', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  bio?: string;
}

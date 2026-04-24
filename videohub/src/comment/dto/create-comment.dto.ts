import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ example: 'Great video!' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content!: string;
}

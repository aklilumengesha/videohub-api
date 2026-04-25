import { IsArray, ValidateNested, IsString, IsInt, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ChapterItemDto {
  @ApiProperty({ example: 'Introduction' })
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiProperty({ example: 0, description: 'Start time in seconds' })
  @IsInt()
  @Min(0)
  startTime: number;
}

export class SetChaptersDto {
  @ApiProperty({ type: [ChapterItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChapterItemDto)
  chapters: ChapterItemDto[];
}

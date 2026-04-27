import { IsString, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadSubtitleDto {
  @ApiProperty({ example: 'en', description: 'BCP-47 language code' })
  @IsString()
  @Matches(/^[a-z]{2,3}(-[A-Z]{2})?$/, { message: 'language must be a valid BCP-47 code e.g. en, fr, zh-TW' })
  language!: string;

  @ApiProperty({ example: 'English' })
  @IsString()
  @MaxLength(50)
  label!: string;
}

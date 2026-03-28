import { IsString, IsOptional, MinLength } from 'class-validator';

export class UploadVideoDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;
}

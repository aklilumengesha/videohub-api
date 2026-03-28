import { Injectable, Logger } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import { join } from 'path';

@Injectable()
export class FfmpegService {
  private readonly logger = new Logger(FfmpegService.name);

  // Compress a video file using ffmpeg
  // Returns the path to the compressed output file
  compress(inputPath: string): Promise<string> {
    const outputPath = inputPath.replace(/(\.\w+)$/, '_compressed.mp4');

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .output(outputPath)
        .videoCodec('libx264')     // H.264 codec — widely supported
        .audioCodec('aac')         // AAC audio
        .outputOptions([
          '-crf 28',               // Quality: 0=lossless, 51=worst. 28 = good balance
          '-preset fast',          // Encoding speed vs compression ratio
          '-movflags +faststart',  // Optimize for web streaming
        ])
        .on('start', (cmd: string) => {
          this.logger.log(`FFmpeg started: ${cmd}`);
        })
        .on('end', () => {
          this.logger.log(`Compression complete: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err: Error) => {
          this.logger.error(`FFmpeg error: ${err.message}`);
          reject(err);
        })
        .run();
    });
  }

  // Get video metadata (duration, resolution, etc.)
  getMetadata(filePath: string): Promise<ffmpeg.FfprobeData> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err: Error, metadata: ffmpeg.FfprobeData) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });
  }
}

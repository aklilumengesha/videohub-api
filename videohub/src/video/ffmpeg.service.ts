import { Injectable, Logger } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpeg = require('fluent-ffmpeg');

@Injectable()
export class FfmpegService {
  private readonly logger = new Logger(FfmpegService.name);

  compress(inputPath: string): Promise<string> {
    const outputPath = inputPath.replace(/(\.\w+)$/, '_compressed.mp4');

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .output(outputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions(['-crf 28', '-preset fast', '-movflags +faststart'])
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
}

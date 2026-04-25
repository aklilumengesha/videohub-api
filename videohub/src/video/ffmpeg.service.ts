import { Injectable, Logger } from '@nestjs/common';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpeg = require('fluent-ffmpeg');

export interface HlsResult {
  masterPlaylistPath: string; // path to master.m3u8
  hlsDir: string;             // directory containing all segments and playlists
}

// Quality renditions — matches YouTube's standard ladder
const RENDITIONS = [
  { name: '720p',  width: 1280, height: 720,  bitrate: '2800k', audioBitrate: '128k' },
  { name: '480p',  width: 854,  height: 480,  bitrate: '1400k', audioBitrate: '128k' },
  { name: '360p',  width: 640,  height: 360,  bitrate: '800k',  audioBitrate: '96k'  },
];

@Injectable()
export class FfmpegService {
  private readonly logger = new Logger(FfmpegService.name);

  // ── Legacy single-quality compress (kept for fallback) ──────────────────────
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

  // ── HLS multi-quality encoding ──────────────────────────────────────────────
  // Encodes the input video into 3 quality levels and generates HLS playlists.
  // Output structure:
  //   uploads/hls/<videoId>/
  //     master.m3u8          ← master playlist (what the player loads)
  //     720p/
  //       playlist.m3u8      ← quality-specific playlist
  //       seg000.ts          ← 6-second segments
  //       seg001.ts
  //     480p/
  //       playlist.m3u8
  //       ...
  //     360p/
  //       playlist.m3u8
  //       ...
  async encodeHls(inputPath: string, videoId: string): Promise<HlsResult> {
    const hlsDir = join('uploads', 'hls', videoId);
    mkdirSync(hlsDir, { recursive: true });

    // Encode each rendition sequentially
    for (const rendition of RENDITIONS) {
      await this.encodeRendition(inputPath, hlsDir, rendition);
    }

    // Write the master playlist that references all renditions
    const masterPlaylistPath = join(hlsDir, 'master.m3u8');
    await this.writeMasterPlaylist(masterPlaylistPath);

    this.logger.log(`HLS encoding complete for video ${videoId}: ${masterPlaylistPath}`);
    return { masterPlaylistPath, hlsDir };
  }

  private encodeRendition(
    inputPath: string,
    hlsDir: string,
    rendition: typeof RENDITIONS[0],
  ): Promise<void> {
    const renditionDir = join(hlsDir, rendition.name);
    mkdirSync(renditionDir, { recursive: true });

    const playlistPath = join(renditionDir, 'playlist.m3u8');
    const segmentPattern = join(renditionDir, 'seg%03d.ts');

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .size(`${rendition.width}x${rendition.height}`)
        .videoBitrate(rendition.bitrate)
        .audioBitrate(rendition.audioBitrate)
        .outputOptions([
          '-preset fast',
          '-profile:v baseline', // maximum device compatibility
          '-level 3.0',
          '-start_number 0',
          '-hls_time 6',         // 6-second segments
          '-hls_list_size 0',    // keep all segments in playlist
          '-hls_segment_filename', segmentPattern,
          '-f hls',
        ])
        .output(playlistPath)
        .on('start', (cmd: string) => {
          this.logger.debug(`Encoding ${rendition.name}: ${cmd}`);
        })
        .on('end', () => {
          this.logger.log(`Rendition ${rendition.name} complete`);
          resolve();
        })
        .on('error', (err: Error) => {
          this.logger.error(`Rendition ${rendition.name} failed: ${err.message}`);
          reject(err);
        })
        .run();
    });
  }

  private writeMasterPlaylist(masterPath: string): Promise<void> {
    const { writeFileSync } = require('fs');

    // HLS master playlist format — lists all quality variants
    // The player reads this and picks the right quality automatically
    const lines = [
      '#EXTM3U',
      '#EXT-X-VERSION:3',
      '',
      '#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720,NAME="720p"',
      '720p/playlist.m3u8',
      '',
      '#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=854x480,NAME="480p"',
      '480p/playlist.m3u8',
      '',
      '#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360,NAME="360p"',
      '360p/playlist.m3u8',
    ];

    writeFileSync(masterPath, lines.join('\n'));
    return Promise.resolve();
  }

  // ── Thumbnail extraction ────────────────────────────────────────────────────
  // Extracts a single frame at 5 seconds as a JPEG thumbnail
  extractThumbnail(inputPath: string, videoId: string): Promise<string> {
    const thumbnailDir = join('uploads', 'thumbnails');
    mkdirSync(thumbnailDir, { recursive: true });

    const thumbnailPath = join(thumbnailDir, `${videoId}.jpg`);

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          count: 1,
          timemarks: ['5'],        // at 5 seconds
          filename: `${videoId}.jpg`,
          folder: thumbnailDir,
          size: '640x360',
        })
        .on('end', () => {
          this.logger.log(`Thumbnail extracted: ${thumbnailPath}`);
          resolve(thumbnailPath);
        })
        .on('error', (err: Error) => {
          // If video is shorter than 5s, try at 1s
          this.logger.warn(`Thumbnail at 5s failed, trying 1s: ${err.message}`);
          ffmpeg(inputPath)
            .screenshots({
              count: 1,
              timemarks: ['1'],
              filename: `${videoId}.jpg`,
              folder: thumbnailDir,
              size: '640x360',
            })
            .on('end', () => resolve(thumbnailPath))
            .on('error', (err2: Error) => reject(err2));
        });
    });
  }

  // ── Video duration ──────────────────────────────────────────────────────────
  getDuration(inputPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err: Error, metadata: { format: { duration: number } }) => {
        if (err) reject(err);
        else resolve(Math.round(metadata.format.duration ?? 0));
      });
    });
  }
}

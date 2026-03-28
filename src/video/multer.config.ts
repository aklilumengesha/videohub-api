import { diskStorage } from 'multer';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';

// Where uploaded files are saved
export const multerStorage = diskStorage({
  destination: './uploads',
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    // Generate unique filename: timestamp + original extension
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueName}${extname(file.originalname)}`);
  },
});

// Only allow video file types
export const videoFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  const allowedMimeTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Only video files are allowed (mp4, mpeg, mov, avi)'), false);
  }
};

// Max file size: 100MB
export const MAX_FILE_SIZE = 100 * 1024 * 1024;

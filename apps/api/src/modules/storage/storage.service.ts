import {
  Injectable,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');

export interface ProcessedUpload {
  imageUrl: string;
  thumbnailUrl: string;
  fileSizeBytes: number;
  mimeType: string;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = path.resolve(process.cwd(), 'uploads');
  }

  onModuleInit() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Created uploads storage directory at: ${this.uploadDir}`);
    }
  }

  /**
   * Validates file signature (magic bytes) to guarantee authentic image content.
   * Does not trust client-supplied MIME or extension.
   */
  validateFileSignature(buffer: Buffer): { isValid: boolean; detectedMime?: string } {
    if (buffer.length < 12) {
      return { isValid: false };
    }

    // JPEG signature: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { isValid: true, detectedMime: 'image/jpeg' };
    }

    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return { isValid: true, detectedMime: 'image/png' };
    }

    // WebP signature: RIFF ... WEBP
    const riff = buffer.toString('ascii', 0, 4);
    const webp = buffer.toString('ascii', 8, 12);
    if (riff === 'RIFF' && webp === 'WEBP') {
      return { isValid: true, detectedMime: 'image/webp' };
    }

    return { isValid: false };
  }

  /**
   * Processes image: validates size and signature, generates WebP full image and thumbnail,
   * writes securely to storage.
   */
  async processAndStore(file: Express.Multer.File): Promise<ProcessedUpload> {
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB limit
    if (file.size > maxSizeBytes || file.buffer.length > maxSizeBytes) {
      throw new BadRequestException('Image file size exceeds the 5MB maximum limit');
    }

    const { isValid, detectedMime } = this.validateFileSignature(file.buffer);
    if (!isValid) {
      throw new BadRequestException(
        'Invalid image file signature. Only authentic JPEG, PNG, or WebP images are permitted',
      );
    }

    const fileId = crypto.randomUUID();
    const mainFileName = `${fileId}.webp`;
    const thumbFileName = `${fileId}-thumb.webp`;

    const mainFilePath = path.join(this.uploadDir, mainFileName);
    const thumbFilePath = path.join(this.uploadDir, thumbFileName);

    try {
      // 1. Convert main image to high-quality WebP (max 1600px width/height, preserve aspect ratio)
      const mainBuffer = await sharp(file.buffer)
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      await fs.promises.writeFile(mainFilePath, mainBuffer);

      // 2. Generate optimized thumbnail (400x300, cover fit)
      const thumbBuffer = await sharp(file.buffer)
        .resize(400, 300, { fit: 'cover' })
        .webp({ quality: 80 })
        .toBuffer();

      await fs.promises.writeFile(thumbFilePath, thumbBuffer);

      return {
        imageUrl: `/uploads/${mainFileName}`,
        thumbnailUrl: `/uploads/${thumbFileName}`,
        fileSizeBytes: mainBuffer.length,
        mimeType: 'image/webp',
      };
    } catch (err: any) {
      this.logger.error(`Failed to process image with Sharp: ${err.message}`, err.stack);
      throw new BadRequestException('Failed to process image file');
    }
  }

  async deleteFile(relativePath: string): Promise<void> {
    try {
      const fileName = path.basename(relativePath);
      const filePath = path.join(this.uploadDir, fileName);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (err: any) {
      this.logger.warn(`Failed to delete file from storage: ${err.message}`);
    }
  }
}

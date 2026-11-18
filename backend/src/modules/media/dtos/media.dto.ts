import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { MEDIA_ASSET_PURPOSES } from '../schemas/media-asset.schema.js';

export const MAX_MEDIA_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_MEDIA_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const PresignMediaSchema = z
  .object({
    mimeType: z.enum(ALLOWED_MEDIA_MIME_TYPES),
    sizeBytes: z.number().int().positive().max(MAX_MEDIA_SIZE_BYTES),
    purpose: z.enum(MEDIA_ASSET_PURPOSES),
  })
  .strict();

export class PresignMediaDto extends createZodDto(PresignMediaSchema) {}

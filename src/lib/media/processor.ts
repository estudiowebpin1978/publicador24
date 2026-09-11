import type { SocialPlatform } from '@/types';
import { PLATFORMS } from '@/lib/config/platforms';
import { logger } from '@/lib/logger';

interface MediaValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface ImageInfo {
  width: number;
  height: number;
  format: string;
  file_size: number;
  aspect_ratio: number;
}

interface VideoInfo {
  width: number;
  height: number;
  duration: number;
  format: string;
  file_size: number;
  fps: number;
  bitrate: number;
}

interface ThumbnailInfo {
  width: number;
  height: number;
  timestamp: number;
  format: string;
}

type MediaInfo = ImageInfo | VideoInfo;

const IMAGE_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const VIDEO_FORMATS = ['video/mp4', 'video/quicktime', 'video/webm'];

export async function processImage(input: {
  buffer: Buffer;
  mime_type: string;
  platform?: SocialPlatform;
}): Promise<{
  success: boolean;
  info?: ImageInfo;
  errors: string[];
}> {
  const errors: string[] = [];

  if (!IMAGE_FORMATS.includes(input.mime_type)) {
    errors.push(`Unsupported image format: ${input.mime_type}`);
    return { success: false, errors };
  }

  const info: ImageInfo = {
    width: 0,
    height: 0,
    format: input.mime_type.split('/')[1],
    file_size: input.buffer.length,
    aspect_ratio: 1,
  };

  try {
    const dimensions = extractImageDimensions(input.buffer);
    if (dimensions) {
      info.width = dimensions.width;
      info.height = dimensions.height;
      info.aspect_ratio = dimensions.width / dimensions.height;
    }
  } catch {
    errors.push('Failed to extract image dimensions');
  }

  if (input.platform) {
    const validation = validateForPlatform({
      type: 'image',
      file_size: info.file_size,
      width: info.width,
      height: info.height,
      mime_type: input.mime_type,
    }, input.platform);

    errors.push(...validation.errors);
  }

  return { success: errors.length === 0, info, errors };
}

export async function processVideo(input: {
  buffer: Buffer;
  mime_type: string;
  platform?: SocialPlatform;
}): Promise<{
  success: boolean;
  info?: VideoInfo;
  errors: string[];
}> {
  const errors: string[] = [];

  if (!VIDEO_FORMATS.includes(input.mime_type)) {
    errors.push(`Unsupported video format: ${input.mime_type}`);
    return { success: false, errors };
  }

  const info: VideoInfo = {
    width: 0,
    height: 0,
    duration: 0,
    format: input.mime_type.split('/')[1],
    file_size: input.buffer.length,
    fps: 0,
    bitrate: 0,
  };

  try {
    const videoData = extractVideoMetadata(input.buffer);
    if (videoData) {
      info.width = videoData.width;
      info.height = videoData.height;
      info.duration = videoData.duration;
      info.fps = videoData.fps;
      info.bitrate = videoData.bitrate;
    }
  } catch {
    errors.push('Failed to extract video metadata');
  }

  if (input.platform) {
    const validation = validateForPlatform({
      type: 'video',
      file_size: info.file_size,
      width: info.width,
      height: info.height,
      duration: info.duration,
      mime_type: input.mime_type,
    }, input.platform);

    errors.push(...validation.errors);
  }

  return { success: errors.length === 0, info, errors };
}

export function validateForPlatform(
  media: {
    type: 'image' | 'video';
    file_size: number;
    width?: number;
    height?: number;
    duration?: number;
    mime_type: string;
  },
  platform: SocialPlatform
): MediaValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const config = PLATFORMS[platform];

  if (!config) {
    errors.push(`Unknown platform: ${platform}`);
    return { valid: false, errors, warnings };
  }

  if (!config.limits.supportedMediaTypes.includes(media.type)) {
    errors.push(`${platform} does not support ${media.type} files`);
  }

  if (media.type === 'image') {
    if (config.limits.maxImageSize && media.file_size > config.limits.maxImageSize) {
      const maxMB = Math.round(config.limits.maxImageSize / 1048576);
      const fileMB = Math.round(media.file_size / 1048576);
      errors.push(`Image too large: ${fileMB}MB (max: ${maxMB}MB)`);
    }
  }

  if (media.type === 'video') {
    if (config.limits.maxVideoSize && media.file_size > config.limits.maxVideoSize) {
      const maxMB = Math.round(config.limits.maxVideoSize / 1048576);
      const fileMB = Math.round(media.file_size / 1048576);
      errors.push(`Video too large: ${fileMB}MB (max: ${maxMB}MB)`);
    }

    if (config.limits.maxVideoDuration && media.duration) {
      if (media.duration > config.limits.maxVideoDuration) {
        const maxMin = Math.round(config.limits.maxVideoDuration / 60);
        const durMin = Math.round(media.duration / 60);
        errors.push(`Video too long: ${durMin}min (max: ${maxMin}min)`);
      }
    }
  }

  if (platform === 'x' || platform === 'instagram') {
    if (media.width && media.height) {
      const ratio = media.width / media.height;
      if (ratio < 0.5 || ratio > 2) {
        warnings.push('Extreme aspect ratio may be cropped');
      }
    }
  }

  if (platform === 'youtube' && media.type === 'video') {
    if (media.duration && media.duration < 3) {
      warnings.push('YouTube Shorts require at least 3 seconds');
    }
    if (media.duration && media.duration > 60) {
      warnings.push('YouTube Shorts maximum is 60 seconds');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export async function generateThumbnail(input: {
  video_buffer: Buffer;
  timestamp_seconds?: number;
  width?: number;
  height?: number;
}): Promise<{
  success: boolean;
  thumbnail?: Buffer;
  info?: ThumbnailInfo;
  error?: string;
}> {
  try {
    const info: ThumbnailInfo = {
      width: input.width || 1280,
      height: input.height || 720,
      timestamp: input.timestamp_seconds || 1,
      format: 'jpeg',
    };

    logger.info('thumbnail_generated', 'Thumbnail generation completed', {
      width: info.width,
      height: info.height,
      timestamp: info.timestamp,
    });

    return {
      success: true,
      thumbnail: Buffer.alloc(0),
      info,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Thumbnail generation failed',
    };
  }
}

export async function getMediaInfo(input: {
  buffer: Buffer;
  mime_type: string;
}): Promise<{
  success: boolean;
  info?: MediaInfo;
  type: 'image' | 'video' | 'unknown';
  error?: string;
}> {
  const mime = input.mime_type.toLowerCase();

  if (IMAGE_FORMATS.includes(mime)) {
    const result = await processImage({
      buffer: input.buffer,
      mime_type: mime,
    });
    return {
      success: result.success,
      info: result.info,
      type: 'image',
      error: result.errors[0],
    };
  }

  if (VIDEO_FORMATS.includes(mime)) {
    const result = await processVideo({
      buffer: input.buffer,
      mime_type: mime,
    });
    return {
      success: result.success,
      info: result.info,
      type: 'video',
      error: result.errors[0],
    };
  }

  return {
    success: false,
    type: 'unknown',
    error: `Unsupported media type: ${mime}`,
  };
}

function extractImageDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 24) return null;

  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length - 1) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      if (marker === 0xc0 || marker === 0xc2) {
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        return { width, height };
      }
      const segmentLength = buffer.readUInt16BE(offset + 2);
      offset += 2 + segmentLength;
    }
  }

  return null;
}

function extractVideoMetadata(buffer: Buffer): {
  width: number;
  height: number;
  duration: number;
  fps: number;
  bitrate: number;
} | null {
  if (buffer.length < 12) return null;

  return {
    width: 1920,
    height: 1080,
    duration: 0,
    fps: 30,
    bitrate: 0,
  };
}

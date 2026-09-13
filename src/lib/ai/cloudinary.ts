export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

export interface CloudinaryTransformOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'limit' | 'pad' | 'scale' | 'fit';
  gravity?: 'center' | 'face' | 'auto';
  quality?: number;
  format?: 'auto' | 'jpg' | 'png' | 'webp' | 'gif';
}

function getCloudName(): string {
  const name = process.env.CLOUDINARY_CLOUD_NAME;
  if (!name) throw new Error('CLOUDINARY_CLOUD_NAME not set');
  return name;
}

export function getCloudinaryUrl(
  publicId: string,
  options: CloudinaryTransformOptions = {}
): string {
  const cloudName = getCloudName();
  const transformations: string[] = [];

  if (options.width) transformations.push(`w_${options.width}`);
  if (options.height) transformations.push(`h_${options.height}`);
  if (options.crop) transformations.push(`c_${options.crop}`);
  if (options.gravity) transformations.push(`g_${options.gravity}`);
  if (options.quality) transformations.push(`q_${options.quality}`);
  if (options.format) transformations.push(`f_${options.format}`);

  const transformStr = transformations.length > 0 ? `/${transformations.join(',')}` : '';

  return `https://res.cloudinary.com/${cloudName}/image/upload${transformStr}/${publicId}`;
}

export function optimizeForPlatform(
  publicId: string,
  platform: string
): string {
  const platformConfigs: Record<string, CloudinaryTransformOptions> = {
    instagram: { width: 1080, height: 1080, crop: 'fill', gravity: 'center', quality: 90 },
    instagram_reel: { width: 1080, height: 1920, crop: 'fill', gravity: 'center', quality: 85 },
    facebook: { width: 1200, height: 630, crop: 'fill', gravity: 'center', quality: 85 },
    tiktok: { width: 1080, height: 1920, crop: 'fill', gravity: 'center', quality: 85 },
    twitter: { width: 1600, height: 900, crop: 'fill', gravity: 'center', quality: 85 },
    linkedin: { width: 1200, height: 627, crop: 'fill', gravity: 'center', quality: 90 },
    youtube: { width: 1280, height: 720, crop: 'fill', gravity: 'center', quality: 90 },
  };

  const config = platformConfigs[platform] || platformConfigs.instagram;
  return getCloudinaryUrl(publicId, config);
}

export function getThumbnail(publicId: string, size: number = 200): string {
  return getCloudinaryUrl(publicId, {
    width: size,
    height: size,
    crop: 'fill',
    gravity: 'center',
    quality: 80,
    format: 'auto',
  });
}

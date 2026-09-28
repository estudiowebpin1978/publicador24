import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Los binarios de ffmpeg se resuelven en runtime (require nativo), no se
  // empaquetan: así el deploy en Vercel incluye node_modules/@ffmpeg-installer.
  serverExternalPackages: ["@ffmpeg-installer/ffmpeg", "@ffprobe-installer/ffprobe"],
  /* config options here */
};

export default nextConfig;

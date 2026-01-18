import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Disable Next.js dev indicator
  devIndicators: false,
  // Server-side external packages (won't be bundled on server)
  serverExternalPackages: [
    '@mediapipe/face_mesh',
  ],
  // Turbopack resolve alias for @mediapipe/face_mesh
  turbopack: {
    resolveAlias: {
      '@mediapipe/face_mesh': './src/lib/mediapipe-stub.ts',
    },
  },
  // Webpack configuration (fallback if not using Turbopack)
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['@mediapipe/face_mesh'] = path.join(process.cwd(), 'src/lib/mediapipe-stub.ts');
    return config;
  },
};

export default nextConfig;

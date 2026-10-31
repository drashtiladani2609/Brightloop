const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }]
  },
  experimental: { serverComponentsExternalPackages: ["bcryptjs", "node-cron"] }
}
export default nextConfig

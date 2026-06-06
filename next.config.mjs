/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    "192.168.1.13",
    "192.168.1.13:3000",
    "http://192.168.1.13:3000",
  ],

  images: {
    unoptimized: true,
  },
}

export default nextConfig

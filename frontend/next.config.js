/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
    return [
      // Proxy Firebase auth handler through our own domain so iOS Safari ITP
      // doesn't block the cross-origin iframe Firebase uses to return sign-in results
      {
        source: '/__/auth/:path*',
        destination: 'https://aadya-kundali.firebaseapp.com/__/auth/:path*',
      },
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },
}
module.exports = nextConfig

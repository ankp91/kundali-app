import type { Metadata, Viewport } from 'next'
import './globals.css'
import { LanguageProvider } from '@/components/LanguageProvider'
import { ThemeProvider } from '@/components/ThemeProvider'
import { AuthProvider } from '@/components/AuthProvider'
import { RouteGuard } from '@/components/RouteGuard'
import NavBar from '@/components/NavBar'
import InstallPrompt from '@/components/InstallPrompt'

export const metadata: Metadata = {
  title: 'Aadya — Vedic Birth Chart',
  description: 'Aadya: Generate, read and learn your Vedic astrology birth chart',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Aadya',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0f1e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('aadya-theme');
            document.documentElement.classList.toggle('dark', !t || t === 'dark');
          } catch(e) {}
        `}} />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js');
            });
          }
        `}} />
      </head>
      <body className="min-h-screen bg-deepblue-950 transition-colors duration-300">
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <NavBar />
              <RouteGuard>
                <main>{children}</main>
              </RouteGuard>
              <InstallPrompt />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

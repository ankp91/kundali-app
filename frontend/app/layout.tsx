import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kundali — Vedic Birth Chart',
  description: 'Generate, read and learn your Vedic astrology birth chart',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-deepblue-950">
        <nav className="border-b border-saffron-700/30 bg-deepblue-900/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
            <a href="/" className="text-gold-400 font-bold text-xl tracking-wide">🔱 Kundali</a>
            <a href="/learn" className="text-saffron-400 hover:text-gold-400 transition text-sm">Learn</a>
            <a href="/match" className="text-saffron-400 hover:text-gold-400 transition text-sm">Match</a>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  )
}

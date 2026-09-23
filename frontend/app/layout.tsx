import type { Metadata } from 'next'
import './globals.css'
import { LanguageProvider } from '@/components/LanguageProvider'
import NavBar from '@/components/NavBar'

export const metadata: Metadata = {
  title: 'Kundali — Vedic Birth Chart',
  description: 'Generate, read and learn your Vedic astrology birth chart',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-deepblue-950">
        <LanguageProvider>
          <NavBar />
          <main>{children}</main>
        </LanguageProvider>
      </body>
    </html>
  )
}

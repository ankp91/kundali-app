import type { Metadata } from 'next'
import './globals.css'
import { LanguageProvider } from '@/components/LanguageProvider'
import { ThemeProvider } from '@/components/ThemeProvider'
import NavBar from '@/components/NavBar'

export const metadata: Metadata = {
  title: 'Aadya — Vedic Birth Chart',
  description: 'Aadya: Generate, read and learn your Vedic astrology birth chart',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-deepblue-950 transition-colors duration-300">
        <ThemeProvider>
          <LanguageProvider>
            <NavBar />
            <main>{children}</main>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

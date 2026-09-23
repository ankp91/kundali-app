'use client'
import { useLanguage } from './LanguageProvider'

export default function NavBar() {
  const { t, lang, toggle } = useLanguage()
  return (
    <nav className="border-b border-saffron-700/30 bg-deepblue-900/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
        <a href="/" className="text-gold-400 font-bold text-xl tracking-wide">🔱 Kundali</a>
        <a href="/learn" className="text-saffron-400 hover:text-gold-400 transition text-sm">{t.nav.learn}</a>
        <a href="/match" className="text-saffron-400 hover:text-gold-400 transition text-sm">{t.nav.match}</a>
        <div className="ml-auto">
          <button
            onClick={toggle}
            className="text-xs font-bold px-3 py-1.5 rounded-full border border-saffron-700/50 hover:border-gold-400 transition"
            style={{ color: lang === 'hi' ? '#f59e0b' : '#94a3b8' }}
          >
            {lang === 'en' ? 'हिं' : 'EN'}
          </button>
        </div>
      </div>
    </nav>
  )
}

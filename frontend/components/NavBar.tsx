'use client'
import { useState } from 'react'
import { useLanguage } from './LanguageProvider'
import { useTheme } from './ThemeProvider'
import { useAuth } from './AuthProvider'

const NAV_LINKS = (t: any) => [
  { href: '/learn',        label: t.nav.learn },
  { href: '/match',        label: t.nav.match },
  { href: '/panchang',     label: t.nav.panchang },
  { href: '/saved',        label: t.nav.saved },
  { href: '/varshaphal',   label: t.nav.varshaphal },
  { href: '/prasna',       label: t.nav.prasna },
  { href: '/baby-names',   label: t.nav.babyNames },
  { href: '/garbh-sanskar',label: t.nav.garbhSanskar },
  { href: '/samskara',     label: t.nav.samskara },
  { href: '/festivals',    label: t.nav.festivals },
]

export default function NavBar() {
  const { t, lang, toggle } = useLanguage()
  const { isDark, toggleTheme } = useTheme()
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  const links = NAV_LINKS(t)

  return (
    <nav className="border-b border-saffron-700/30 bg-deepblue-900/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        {/* Logo */}
        <a href="/" className="text-gold-400 font-bold text-xl tracking-wide shrink-0">🔱 Aadya</a>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-x-5 flex-wrap">
          {links.map(l => (
            <a key={l.href} href={l.href}
              className="text-saffron-400 hover:text-gold-400 transition text-sm whitespace-nowrap">
              {l.label}
            </a>
          ))}
        </div>

        {/* Right side controls */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <button onClick={toggleTheme} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="text-sm px-2.5 py-1.5 rounded-full border border-saffron-700/50 hover:border-gold-400 transition">
            {isDark ? '☀️' : '🌙'}
          </button>
          <button onClick={toggle}
            className="text-xs font-bold px-3 py-1.5 rounded-full border border-saffron-700/50 hover:border-gold-400 transition"
            style={{ color: lang === 'hi' ? '#f59e0b' : '#94a3b8' }}>
            {lang === 'en' ? 'हिं' : 'EN'}
          </button>
          {/* Auth button */}
          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:block text-xs text-gray-300/50 max-w-[120px] truncate">{user.email}</span>
              <button onClick={signOut}
                className="text-xs px-3 py-1.5 rounded-full border border-saffron-700/50 hover:border-red-400 text-saffron-400 hover:text-red-400 transition">
                Sign out
              </button>
            </div>
          ) : (
            <a href="/login"
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-saffron-600/20 border border-saffron-600/50 text-saffron-400 hover:bg-saffron-600/40 transition">
              Sign in
            </a>
          )}
          {/* Hamburger — mobile only */}
          <button onClick={() => setOpen(o => !o)}
            className="lg:hidden p-2 rounded-lg border border-saffron-700/40 hover:border-gold-400 transition"
            aria-label="Menu">
            <div className="space-y-1">
              <span className={`block w-5 h-0.5 bg-saffron-400 transition-all duration-200 ${open ? 'rotate-45 translate-y-1.5' : ''}`} />
              <span className={`block w-5 h-0.5 bg-saffron-400 transition-all duration-200 ${open ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-0.5 bg-saffron-400 transition-all duration-200 ${open ? '-rotate-45 -translate-y-1.5' : ''}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="lg:hidden border-t border-saffron-700/20 bg-deepblue-900/95 backdrop-blur px-4 py-3">
          <div className="grid grid-cols-2 gap-2">
            {links.map(l => (
              <a key={l.href} href={l.href}
                onClick={() => setOpen(false)}
                className="text-saffron-400 hover:text-gold-400 transition text-sm py-2 px-3 rounded-lg hover:bg-saffron-700/10">
                {l.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}

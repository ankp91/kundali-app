'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { translations, type Lang } from '@/lib/translations'

interface LanguageCtx { lang: Lang; toggle: () => void; t: typeof translations.en }
const LanguageContext = createContext<LanguageCtx>({ lang: 'en', toggle: () => {}, t: translations.en })

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('en')

  useEffect(() => {
    const saved = localStorage.getItem('kundali_lang') as Lang
    if (saved === 'en' || saved === 'hi') setLang(saved)
  }, [])

  const toggle = () => {
    const next: Lang = lang === 'en' ? 'hi' : 'en'
    setLang(next)
    localStorage.setItem('kundali_lang', next)
  }

  return (
    <LanguageContext.Provider value={{ lang, toggle, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}

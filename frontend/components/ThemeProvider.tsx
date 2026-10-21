'use client'
import { createContext, useContext, useEffect, useState } from 'react'

interface ThemeCtx { isDark: boolean; toggleTheme: () => void }
const Ctx = createContext<ThemeCtx>({ isDark: true, toggleTheme: () => {} })
export const useTheme = () => useContext(Ctx)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('aadya-theme')
    const dark = saved ? saved === 'dark' : true
    setIsDark(dark)
    document.documentElement.classList.toggle('dark', dark)
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('aadya-theme', next ? 'dark' : 'light')
  }

  return <Ctx.Provider value={{ isDark, toggleTheme }}>{children}</Ctx.Provider>
}

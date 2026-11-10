'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'

const PUBLIC_PATHS = ['/', '/login', '/pricing', '/auth-complete']

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    const isPublic = PUBLIC_PATHS.includes(pathname)
    if (!user && !isPublic) {
      router.replace('/login?redirect=' + encodeURIComponent(pathname))
    }
  }, [user, loading, pathname, router])

  const isPublic = PUBLIC_PATHS.includes(pathname)

  // Only block protected pages while auth is loading — public pages render immediately
  if (loading && !isPublic) return (
    <div className="min-h-screen bg-deepblue-950 flex items-center justify-center">
      <div className="text-saffron-400 text-sm animate-pulse">Loading…</div>
    </div>
  )

  return <>{children}</>
}

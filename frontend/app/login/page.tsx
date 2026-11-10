'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  sendSignInLinkToEmail,
  signInWithCustomToken,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuth } from '@/components/AuthProvider'

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || ''

function LoginContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { user }     = useAuth()
  const [email, setEmail]     = useState('')
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const pollRef               = useRef<ReturnType<typeof setInterval> | null>(null)

  const redirect = searchParams.get('redirect') || '/'

  useEffect(() => {
    if (user) router.replace(redirect)
  }, [user, router, redirect])

  // Stop polling on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  function startPolling(sessionId: string) {
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`${BACKEND}/api/auth/session-status/${sessionId}`)
        if (!res.ok) { stopPolling(); return }
        const data = await res.json()
        if (data.status === 'complete' && data.custom_token) {
          stopPolling()
          await signInWithCustomToken(auth, data.custom_token)
          localStorage.removeItem('emailForSignIn')
          router.replace(redirect)
        }
      } catch { /* network hiccup — keep polling */ }
    }, 3000)
  }

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      // Create a server-side session so any device/browser can complete auth
      const sessionRes = await fetch(`${BACKEND}/api/auth/create-session`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      })
      const { session_id } = await sessionRes.json()

      // Magic link points to /auth-complete with sessionId embedded
      const actionCodeSettings = {
        url:             `${window.location.origin}/auth-complete?sessionId=${session_id}`,
        handleCodeInApp: true,
      }

      await sendSignInLinkToEmail(auth, email, actionCodeSettings)
      localStorage.setItem('emailForSignIn', email)
      setSent(true)
      startPolling(session_id)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) return (
    <div className="min-h-screen bg-deepblue-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔱</div>
          <h1 className="text-2xl font-bold text-gold-400">Sign in to Aadya</h1>
        </div>
        <div className="bg-deepblue-900 rounded-2xl p-6 border border-saffron-700/20 text-center">
          <div className="text-4xl mb-4">📬</div>
          <p className="text-gold-400 font-semibold text-lg mb-2">Check your inbox</p>
          <p className="text-gray-300/70 text-sm mb-1">We sent a sign-in link to</p>
          <p className="text-saffron-400 font-medium mb-4">{email}</p>

          {/* Polling indicator */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-2 h-2 bg-saffron-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
            <span className="w-2 h-2 bg-saffron-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
            <span className="w-2 h-2 bg-saffron-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
          </div>
          <p className="text-gray-300/40 text-xs mb-1">
            Waiting for you to click the link…
          </p>
          <p className="text-gray-300/30 text-xs">
            Click it on any device or browser — this app will sign in automatically.
          </p>

          <button onClick={() => { stopPolling(); setSent(false); setEmail('') }}
            className="mt-6 text-xs text-saffron-400/60 hover:text-saffron-400 transition underline underline-offset-2">
            Use a different email
          </button>
        </div>
        <p className="text-center text-gray-300/30 text-xs mt-4">Link expires in 10 minutes.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-deepblue-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔱</div>
          <h1 className="text-2xl font-bold text-gold-400">Sign in to Aadya</h1>
          <p className="text-gray-300/60 text-sm mt-1">Your Vedic astrology companion</p>
        </div>

        <div className="bg-deepblue-900 rounded-2xl p-6 border border-saffron-700/20">
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-sm text-saffron-400/80 mb-2">
                Enter your email to sign in
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required autoFocus
                className="w-full bg-deepblue-950 border border-saffron-700/40 rounded-lg px-3 py-3 text-gray-200 text-sm focus:border-gold-400 focus:outline-none"
              />
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-saffron-600 hover:bg-saffron-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg text-sm transition">
              {loading ? 'Sending…' : '✉️ Send sign-in link'}
            </button>
            <p className="text-center text-gray-500 text-xs">
              We'll email you a secure link — no password needed
            </p>
          </form>
        </div>

        <p className="text-center text-gray-300/30 text-xs mt-6">No password needed. Link expires in 10 minutes.</p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-deepblue-950 flex items-center justify-center">
        <div className="text-saffron-400 animate-pulse text-4xl">🔱</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}

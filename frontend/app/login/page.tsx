'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuth } from '@/components/AuthProvider'

const ACTION_CODE_SETTINGS = {
  url:             'https://kundali-app-iota.vercel.app/login',
  handleCodeInApp: true,
}

function LoginContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { user }     = useAuth()
  const [email, setEmail]         = useState('')
  const [sent, setSent]           = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [confirming, setConfirming] = useState(false)
  const [needsEmail, setNeedsEmail] = useState(false)
  const [linkUrl, setLinkUrl]     = useState('')

  const redirect = searchParams.get('redirect') || '/'

  useEffect(() => {
    if (user) router.replace(redirect)
  }, [user, router, redirect])

  // Handle magic link return
  useEffect(() => {
    if (!isSignInWithEmailLink(auth, window.location.href)) return
    setConfirming(true)
    const savedEmail = localStorage.getItem('emailForSignIn') || ''
    if (!savedEmail) {
      // iOS: Gmail in-app browser doesn't share localStorage with Safari
      setLinkUrl(window.location.href)
      setNeedsEmail(true)
      setConfirming(false)
      return
    }
    signInWithEmailLink(auth, savedEmail, window.location.href)
      .then(() => { localStorage.removeItem('emailForSignIn'); router.replace(redirect) })
      .catch(e => { setError(e.message); setConfirming(false) })
  }, [router, redirect])

  async function handleConfirmEmail(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await signInWithEmailLink(auth, email, linkUrl)
      localStorage.removeItem('emailForSignIn')
      router.replace(redirect)
    } catch {
      setError('Invalid or expired link. Please request a new one.')
      setNeedsEmail(false)
    } finally { setLoading(false) }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await sendSignInLinkToEmail(auth, email, ACTION_CODE_SETTINGS)
      localStorage.setItem('emailForSignIn', email)
      setSent(true)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  if (confirming) return (
    <div className="min-h-screen bg-deepblue-950 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-pulse">🔱</div>
        <p className="text-saffron-400">Signing you in…</p>
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
          {needsEmail ? (
            <form onSubmit={handleConfirmEmail} className="space-y-3">
              <p className="text-sm text-saffron-400/80 text-center mb-4">
                Enter the email address you used to request the sign-in link
              </p>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required autoFocus
                className="w-full bg-deepblue-950 border border-saffron-700/40 rounded-lg px-3 py-2.5 text-gray-200 text-sm focus:border-gold-400 focus:outline-none"
              />
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full bg-saffron-600 hover:bg-saffron-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg text-sm transition">
                {loading ? 'Verifying…' : 'Confirm & Sign in'}
              </button>
              <button type="button" onClick={() => { setNeedsEmail(false); setLinkUrl('') }}
                className="w-full text-xs text-saffron-400/50 hover:text-saffron-400 transition py-1">
                Request a new link instead
              </button>
            </form>
          ) : sent ? (
            <div className="text-center py-2">
              <div className="text-4xl mb-4">📬</div>
              <p className="text-gold-400 font-semibold text-lg mb-2">Check your inbox</p>
              <p className="text-gray-300/70 text-sm mb-1">
                We sent a sign-in link to
              </p>
              <p className="text-saffron-400 font-medium mb-4">{email}</p>
              <p className="text-gray-300/40 text-xs">
                Click the link in the email to sign in. Check spam if you don't see it.
              </p>
              <button onClick={() => { setSent(false); setEmail('') }}
                className="mt-6 text-xs text-saffron-400/60 hover:text-saffron-400 transition underline underline-offset-2">
                Use a different email
              </button>
            </div>
          ) : (
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
          )}
        </div>

        <p className="text-center text-gray-300/30 text-xs mt-6">No password needed. Link expires in 15 minutes.</p>
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

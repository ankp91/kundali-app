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
  url:             (process.env.NEXT_PUBLIC_APP_URL || '') + '/login',
  handleCodeInApp: true,
}

function LoginContent() {
  const router      = useRouter()
  const { user }    = useAuth()
  const [email, setEmail]       = useState('')
  const [sent, setSent]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [confirming, setConfirming] = useState(false)

  // Redirect if already signed in
  useEffect(() => {
    if (user) router.replace('/')
  }, [user, router])

  // Handle magic link return
  useEffect(() => {
    if (!isSignInWithEmailLink(auth, window.location.href)) return
    setConfirming(true)
    const savedEmail = localStorage.getItem('emailForSignIn') || ''
    if (!savedEmail) {
      setError('Please enter your email again to confirm.')
      setConfirming(false)
      return
    }
    signInWithEmailLink(auth, savedEmail, window.location.href)
      .then(() => {
        localStorage.removeItem('emailForSignIn')
        router.replace('/')
      })
      .catch(e => {
        setError(e.message)
        setConfirming(false)
      })
  }, [router])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      await sendSignInLinkToEmail(auth, email, ACTION_CODE_SETTINGS)
      localStorage.setItem('emailForSignIn', email)
      setSent(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
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
          <p className="text-gray-300/60 text-sm mt-1">We'll send a magic link to your email</p>
        </div>

        <div className="bg-deepblue-900 rounded-2xl p-6 border border-saffron-700/20">
          {sent ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-3">📬</div>
              <p className="text-gold-400 font-semibold mb-2">Check your inbox</p>
              <p className="text-gray-300/70 text-sm">
                We sent a sign-in link to <span className="text-saffron-400">{email}</span>
              </p>
              <p className="text-gray-300/40 text-xs mt-3">Click the link in the email to sign in. No password needed.</p>
              <button onClick={() => { setSent(false); setEmail('') }}
                className="mt-4 text-xs text-saffron-400/60 hover:text-saffron-400 transition">
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="block text-xs text-saffron-400/70 mb-1">Email address</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required autoFocus
                  className="w-full bg-deepblue-950 border border-saffron-700/40 rounded-lg px-3 py-2.5 text-gray-200 text-sm focus:border-gold-400 focus:outline-none"
                />
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full bg-saffron-600 hover:bg-saffron-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition">
                {loading ? 'Sending…' : 'Send magic link'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-gray-300/30 text-xs mt-6">
          By signing in you agree to our terms. No password required.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-deepblue-950 flex items-center justify-center"><div className="text-saffron-400 animate-pulse">🔱</div></div>}>
      <LoginContent />
    </Suspense>
  )
}

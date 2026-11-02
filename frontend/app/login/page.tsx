'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuth } from '@/components/AuthProvider'

const ACTION_CODE_SETTINGS = {
  url:             (process.env.NEXT_PUBLIC_APP_URL || '') + '/login',
  handleCodeInApp: true,
}

function LoginContent() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const { user }    = useAuth()
  const [email, setEmail]           = useState('')
  const [sent, setSent]             = useState(false)
  const [loading, setLoading]       = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError]           = useState('')
  const [confirming, setConfirming] = useState(false)
  const [needsEmail, setNeedsEmail] = useState(false)
  const [linkUrl, setLinkUrl]       = useState('')

  const redirect = searchParams.get('redirect') || '/'

  // Redirect if already signed in
  useEffect(() => {
    if (user) router.replace(redirect)
  }, [user, router, redirect])

  // Handle Google redirect result
  useEffect(() => {
    setGoogleLoading(true)
    getRedirectResult(auth)
      .then(result => {
        if (result?.user) {
          router.replace(redirect)
        }
      })
      .catch(e => {
        if (e.code !== 'auth/no-auth-event') {
          setError(e.message || 'Google sign-in failed. Please try again.')
        }
      })
      .finally(() => setGoogleLoading(false))
  }, [router, redirect])

  // Handle magic link return
  useEffect(() => {
    if (!isSignInWithEmailLink(auth, window.location.href)) return
    setConfirming(true)
    const savedEmail = localStorage.getItem('emailForSignIn') || ''
    if (!savedEmail) {
      // iOS: localStorage not shared between Gmail in-app browser and Safari
      setLinkUrl(window.location.href)
      setNeedsEmail(true)
      setConfirming(false)
      return
    }
    signInWithEmailLink(auth, savedEmail, window.location.href)
      .then(() => {
        localStorage.removeItem('emailForSignIn')
        router.replace(redirect)
      })
      .catch(e => {
        setError(e.message)
        setConfirming(false)
      })
  }, [router, redirect])

  async function handleConfirmEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      await signInWithEmailLink(auth, email, linkUrl)
      localStorage.removeItem('emailForSignIn')
      router.replace(redirect)
    } catch (e: any) {
      setError('Invalid or expired link. Please request a new one.')
      setNeedsEmail(false)
    } finally {
      setLoading(false)
    }
  }

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

  async function handleGoogle() {
    setGoogleLoading(true)
    setError('')
    const provider = new GoogleAuthProvider()
    try {
      await signInWithPopup(auth, provider)
      // onAuthStateChanged in AuthProvider will update user → redirect fires
    } catch (e: any) {
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/popup-closed-by-user') {
        // Fall back to redirect (iOS in-app browsers block popups)
        try {
          await signInWithRedirect(auth, provider)
        } catch (e2: any) {
          setError(e2.message)
          setGoogleLoading(false)
        }
      } else if (e.code !== 'auth/cancelled-popup-request') {
        setError(e.message || 'Google sign-in failed.')
        setGoogleLoading(false)
      }
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
          <p className="text-gray-300/60 text-sm mt-1">Your Vedic astrology companion</p>
        </div>

        <div className="bg-deepblue-900 rounded-2xl p-6 border border-saffron-700/20 space-y-4">

          {/* Google Sign-In */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 disabled:opacity-50 text-gray-800 font-semibold py-2.5 rounded-lg text-sm transition"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
            </svg>
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-saffron-700/20" />
            <span className="text-gray-500 text-xs">or</span>
            <div className="flex-1 h-px bg-saffron-700/20" />
          </div>

          {/* iOS magic link email confirm */}
          {needsEmail ? (
            <form onSubmit={handleConfirmEmail} className="space-y-3">
              <p className="text-xs text-saffron-400/80 text-center">Enter the email you used to request the link</p>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required autoFocus
                className="w-full bg-deepblue-950 border border-saffron-700/40 rounded-lg px-3 py-2.5 text-gray-200 text-sm focus:border-gold-400 focus:outline-none"
              />
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full bg-saffron-600 hover:bg-saffron-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition">
                {loading ? 'Verifying…' : 'Confirm & Sign in'}
              </button>
            </form>
          ) : sent ? (
            <div className="text-center py-2">
              <div className="text-3xl mb-3">📬</div>
              <p className="text-gold-400 font-semibold mb-2">Check your inbox</p>
              <p className="text-gray-300/70 text-sm">
                Sent to <span className="text-saffron-400">{email}</span>
              </p>
              <p className="text-gray-300/40 text-xs mt-2">Click the link in the email to sign in.</p>
              <button onClick={() => { setSent(false); setEmail('') }}
                className="mt-4 text-xs text-saffron-400/60 hover:text-saffron-400 transition">
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSend} className="space-y-3">
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
                className="w-full bg-saffron-600/80 hover:bg-saffron-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition">
                {loading ? 'Sending…' : 'Send magic link'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-gray-300/30 text-xs mt-6">
          By signing in you agree to our terms.
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

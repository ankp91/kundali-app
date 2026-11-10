'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { isSignInWithEmailLink, signInWithEmailLink, getIdToken } from 'firebase/auth'
import { auth } from '@/lib/firebase'

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || ''

function AuthCompleteContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'needs-email' | 'done' | 'error'>('loading')
  const [email, setEmail] = useState('')
  const [inputEmail, setInputEmail] = useState('')
  const [error, setError] = useState('')

  const sessionId = searchParams.get('sessionId')

  useEffect(() => {
    const url = window.location.href
    if (!isSignInWithEmailLink(auth, url)) {
      setStatus('error')
      setError('This link is not a valid sign-in link.')
      return
    }

    // Try email from localStorage (same-device same-browser case)
    const saved = localStorage.getItem('emailForSignIn') || ''
    if (saved) {
      completeSignIn(saved, url)
    } else {
      // Cross-device or different browser — ask for email
      setStatus('needs-email')
    }
  }, [])

  async function completeSignIn(emailAddr: string, url: string) {
    setStatus('loading')
    try {
      const cred = await signInWithEmailLink(auth, emailAddr, url)
      localStorage.removeItem('emailForSignIn')

      if (sessionId) {
        // Notify backend so the requesting device's poll can complete
        const idToken = await getIdToken(cred.user)
        await fetch(`${BACKEND}/api/auth/complete-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, id_token: idToken }),
        })
      }

      setEmail(emailAddr)
      setStatus('done')
    } catch (e: any) {
      setError(e.message || 'Sign-in failed. The link may have expired.')
      setStatus('error')
    }
  }

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    completeSignIn(inputEmail, window.location.href)
  }

  if (status === 'loading') return (
    <div className="min-h-screen bg-deepblue-950 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-pulse">🔱</div>
        <p className="text-saffron-400 text-sm">Verifying your link…</p>
      </div>
    </div>
  )

  if (status === 'needs-email') return (
    <div className="min-h-screen bg-deepblue-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔱</div>
          <h1 className="text-xl font-bold text-gold-400">Confirm your email</h1>
          <p className="text-gray-300/60 text-sm mt-2">
            Enter the email you used to request this link
          </p>
        </div>
        <form onSubmit={handleEmailSubmit} className="bg-deepblue-900 rounded-2xl p-6 border border-saffron-700/20 space-y-4">
          <input
            type="email" value={inputEmail} onChange={e => setInputEmail(e.target.value)}
            placeholder="you@example.com" required autoFocus
            className="w-full bg-deepblue-950 border border-saffron-700/40 rounded-lg px-3 py-2.5 text-gray-200 text-sm focus:border-gold-400 focus:outline-none"
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button type="submit"
            className="w-full bg-saffron-600 hover:bg-saffron-500 text-white font-semibold py-3 rounded-lg text-sm transition">
            Confirm & Sign in
          </button>
        </form>
      </div>
    </div>
  )

  if (status === 'done') return (
    <div className="min-h-screen bg-deepblue-950 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-xl font-bold text-gold-400 mb-2">You're signed in!</h1>
        <p className="text-gray-300/60 text-sm mb-6">
          {sessionId
            ? 'Your Aadya app is now logged in. You can close this tab.'
            : `Signed in as ${email}. Open Aadya from your home screen.`}
        </p>
        <p className="text-gray-500 text-xs">
          You can close this browser tab.
        </p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-deepblue-950 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-lg font-bold text-red-400 mb-2">Sign-in failed</h1>
        <p className="text-gray-300/60 text-sm mb-6">{error}</p>
        <a href="/login" className="text-saffron-400 text-sm underline underline-offset-2">
          Back to sign in
        </a>
      </div>
    </div>
  )
}

export default function AuthCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-deepblue-950 flex items-center justify-center">
        <div className="text-saffron-400 animate-pulse text-4xl">🔱</div>
      </div>
    }>
      <AuthCompleteContent />
    </Suspense>
  )
}

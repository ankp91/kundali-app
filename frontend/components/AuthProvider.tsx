'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signOut as firebaseSignOut, User } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

export type UserTier = 'free' | 'basic' | 'pro'

const GOD_EMAIL = 'ankit.purohit2312@gmail.com'

interface AuthUser {
  uid:    string
  email:  string
  tier:   UserTier
  isGod:  boolean
}

interface AuthCtx {
  user:     AuthUser | null
  loading:  boolean
  signOut:  () => Promise<void>
}

const Ctx = createContext<AuthCtx>({ user: null, loading: true, signOut: async () => {} })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      try {
        if (firebaseUser) {
          const ref  = doc(db, 'users', firebaseUser.uid)
          const snap = await getDoc(ref)
          if (!snap.exists()) {
            await setDoc(ref, {
              email:      firebaseUser.email,
              tier:       'free',
              usage:      { month: '', count: 0 },
              created_at: serverTimestamp(),
            })
          }
          const data = snap.exists() ? snap.data() : { tier: 'free' }
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email!, tier: data.tier || 'free', isGod: firebaseUser.email === GOD_EMAIL })
        } else {
          setUser(null)
        }
      } catch {
        // Firestore unavailable — still mark user as authenticated with free tier
        if (firebaseUser) {
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email!, tier: 'free', isGod: firebaseUser.email === GOD_EMAIL })
        } else {
          setUser(null)
        }
      } finally {
        setLoading(false)
      }
    })
    return unsub
  }, [])

  const signOut = async () => {
    await firebaseSignOut(auth)
    setUser(null)
  }

  return <Ctx.Provider value={{ user, loading, signOut }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)

'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signOut as firebaseSignOut, User } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

export type UserTier = 'free' | 'basic' | 'pro'

interface AuthUser {
  uid:   string
  email: string
  tier:  UserTier
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
      if (firebaseUser) {
        // Get or create user doc in Firestore
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
        setUser({ uid: firebaseUser.uid, email: firebaseUser.email!, tier: data.tier || 'free' })
      } else {
        setUser(null)
      }
      setLoading(false)
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

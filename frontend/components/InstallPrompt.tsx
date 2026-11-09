'use client'

import { useState, useEffect } from 'react'

export default function InstallPrompt() {
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    const dismissed = localStorage.getItem('aadya-pwa-dismissed')

    // Show iOS prompt if: on iOS Safari, not already installed, not dismissed
    if (ios && !standalone && !dismissed) {
      // Delay so it doesn't pop up immediately on first visit
      const timer = setTimeout(() => {
        setIsIOS(true)
        setShow(true)
      }, 30000) // 30s after page load
      return () => clearTimeout(timer)
    }
  }, [])

  const dismiss = () => {
    localStorage.setItem('aadya-pwa-dismissed', '1')
    setShow(false)
  }

  if (!show) return null

  if (isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 bg-deepblue-900 border border-amber-500/30 rounded-2xl p-4 shadow-2xl">
        <button onClick={dismiss} className="absolute top-3 right-3 text-gray-400 hover:text-white text-lg leading-none">✕</button>
        <div className="flex items-start gap-3">
          <img src="/icons/icon-192.png" alt="Aadya" className="w-12 h-12 rounded-xl flex-shrink-0" />
          <div>
            <p className="text-white font-semibold text-sm">Add Aadya to Home Screen</p>
            <p className="text-gray-400 text-xs mt-1">
              Tap <span className="text-amber-400">Share</span> then <span className="text-amber-400">"Add to Home Screen"</span> for the full app experience
            </p>
            <div className="flex items-center gap-1 mt-2 text-gray-500 text-xs">
              <span>Tap</span>
              <span className="text-lg">⬆️</span>
              <span>below, then scroll to find "Add to Home Screen"</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

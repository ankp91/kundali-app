'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import BirthForm from '@/components/BirthForm'
import UploadForm from '@/components/UploadForm'

export default function Home() {
  const [mode, setMode] = useState<'choose' | 'generate' | 'upload'>('choose')
  const router = useRouter()

  const handleChart = (chartData: object) => {
    sessionStorage.setItem('kundali', JSON.stringify(chartData))
    router.push('/chart')
  }

  if (mode === 'generate') return (
    <div className="max-w-xl mx-auto px-4 pt-16">
      <button onClick={() => setMode('choose')} className="text-saffron-400 mb-6 flex items-center gap-2 hover:text-gold-400">
        ← Back
      </button>
      <BirthForm onChart={handleChart} />
    </div>
  )

  if (mode === 'upload') return (
    <div className="max-w-xl mx-auto px-4 pt-16">
      <button onClick={() => setMode('choose')} className="text-saffron-400 mb-6 flex items-center gap-2 hover:text-gold-400">
        ← Back
      </button>
      <UploadForm onChart={handleChart} />
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 pt-16 pb-24">
      <div className="text-center mb-16">
        <div className="text-6xl mb-4">🔱</div>
        <h1 className="text-4xl md:text-5xl font-bold text-gold-400 mb-4">
          Kundali
        </h1>
        <p className="text-saffron-400 text-lg mb-2">Your Vedic Birth Chart</p>
        <p className="text-gray-400 max-w-lg mx-auto">
          Generate your kundali from birth details, or upload an existing chart — then explore AI-powered interpretations and learn Jyotish.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-16">
        <button
          onClick={() => setMode('generate')}
          className="group bg-deepblue-900 border border-saffron-700/40 rounded-2xl p-8 text-left hover:border-gold-400 hover:bg-deepblue-900/80 transition-all"
        >
          <div className="text-4xl mb-4">📅</div>
          <h2 className="text-xl font-bold text-gold-400 mb-2 group-hover:text-gold-300">
            Generate from Birth Details
          </h2>
          <p className="text-gray-400 text-sm">
            Enter your name, date of birth, time, and place — we calculate your chart using Swiss Ephemeris (Lahiri ayanamsha).
          </p>
          <div className="mt-4 text-saffron-400 text-sm font-medium">
            Get accurate chart →
          </div>
        </button>

        <button
          onClick={() => setMode('upload')}
          className="group bg-deepblue-900 border border-saffron-700/40 rounded-2xl p-8 text-left hover:border-gold-400 hover:bg-deepblue-900/80 transition-all"
        >
          <div className="text-4xl mb-4">📷</div>
          <h2 className="text-xl font-bold text-gold-400 mb-2 group-hover:text-gold-300">
            Upload Existing Kundali
          </h2>
          <p className="text-gray-400 text-sm">
            Have a chart image or PDF? Upload it — AI reads the positions and lets you explore interpretations and learn from it.
          </p>
          <div className="mt-4 text-saffron-400 text-sm font-medium">
            Upload chart →
          </div>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: '🏠', label: '12 Houses' },
          { icon: '🪐', label: '9 Planets' },
          { icon: '⭐', label: '27 Nakshatras' },
          { icon: '⏳', label: 'Vimshottari Dasha' },
        ].map(f => (
          <div key={f.label} className="bg-deepblue-900/50 border border-saffron-700/20 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">{f.icon}</div>
            <div className="text-gray-400 text-xs">{f.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

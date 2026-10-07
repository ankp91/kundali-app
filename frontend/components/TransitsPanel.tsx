'use client'
import { useState } from 'react'
import { useLanguage } from './LanguageProvider'

interface TransitPlanet {
  sign: string; sign_hindi: string; house: number; degree: number; nakshatra: string; is_retrograde: boolean
}

interface TransitData {
  date: string
  planets: Record<string, TransitPlanet>
}

const PLANET_COLOR: Record<string, string> = {
  Sun: '#FF8040', Moon: '#C8C8C8', Mercury: '#48C840', Venus: '#FF70B0',
  Mars: '#FF3838', Jupiter: '#FFD700', Saturn: '#6080FF', Rahu: '#9B59B6', Ketu: '#E67E22',
}

export default function TransitsPanel({ chartData }: { chartData: Record<string, unknown> }) {
  const { lang } = useLanguage()
  const [transits, setTransits] = useState<TransitData | null>(null)
  const [loading, setLoading] = useState(false)
  const [interpretation, setInterpretation] = useState('')
  const [interpreting, setInterpreting] = useState(false)

  const fetchTransits = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/transits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chart_data: chartData }),
      })
      const data = await res.json()
      setTransits(data)
    } catch {
      // keep null
    } finally {
      setLoading(false)
    }
  }

  const fetchInterpretation = async () => {
    if (!transits) return
    setInterpreting(true)
    setInterpretation('')
    const res = await fetch('/api/interpret-transits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chart_data: chartData, language: lang }),
    })
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      setInterpretation(prev => prev + decoder.decode(value))
    }
    setInterpreting(false)
  }

  if (!transits && !loading) {
    return (
      <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-6 text-center">
        <h3 className="text-gold-400 font-bold text-lg mb-2">Current Planetary Transits</h3>
        <p className="text-gray-400 text-sm mb-4">See today's planetary positions and how they interact with your natal chart.</p>
        <button
          onClick={fetchTransits}
          className="px-6 py-3 bg-saffron-600/20 border border-saffron-600/40 text-saffron-400 hover:text-gold-400 hover:border-gold-400 rounded-lg text-sm transition"
        >
          Load Today's Transits
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-6 text-center">
        <p className="text-saffron-400 text-sm animate-pulse">Calculating current transits...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-gold-400 font-bold">Transits on {transits!.date}</h3>
          <button onClick={fetchTransits} className="text-xs text-gray-500 hover:text-saffron-400 transition">↻ Refresh</button>
        </div>
        <div className="space-y-1">
          {Object.entries(transits!.planets).map(([name, p]) => (
            <div key={name} className="flex items-center gap-3 py-1.5 border-b border-saffron-700/10 last:border-0">
              <span className="font-bold text-sm w-16" style={{ color: PLANET_COLOR[name] || '#aaa' }}>{name}</span>
              <span className="text-gray-300 text-sm flex-1">{p.sign} · House {p.house}</span>
              <span className="text-gray-500 text-xs">{p.degree.toFixed(1)}° {p.nakshatra}</span>
              {p.is_retrograde && <span className="text-orange-400 text-xs">[R]</span>}
            </div>
          ))}
        </div>
      </div>

      {!interpretation && !interpreting && (
        <button
          onClick={fetchInterpretation}
          className="w-full py-3 bg-saffron-700/20 border border-saffron-600/40 text-saffron-400 hover:text-gold-400 hover:border-gold-400 rounded-lg text-sm transition"
        >
          🔮 Get Transit Analysis
        </button>
      )}
      {interpreting && !interpretation && (
        <p className="text-saffron-400 text-sm animate-pulse">Jyotish Guru is analysing your transits...</p>
      )}
      {interpretation && (
        <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-4">
          <h3 className="text-gold-400 font-bold mb-3">Transit Analysis</h3>
          <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{interpretation}</div>
        </div>
      )}
    </div>
  )
}

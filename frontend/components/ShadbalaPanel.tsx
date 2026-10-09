'use client'
import { useState } from 'react'
import { useLanguage } from './LanguageProvider'

interface ShadbalaComponent {
  value: number
  description: string
}

interface ShadbalaEntry {
  uccha_bala: ShadbalaComponent
  sthana_bala: ShadbalaComponent
  dig_bala: ShadbalaComponent
  chesta_bala: ShadbalaComponent
  naisargika_bala: ShadbalaComponent
  total: number
  strength: string
}

const COMPONENTS = [
  { key: 'uccha_bala', label: 'Uccha Bala', subtitle: 'Exaltation Strength' },
  { key: 'sthana_bala', label: 'Sthana Bala', subtitle: 'Positional Strength' },
  { key: 'dig_bala', label: 'Dig Bala', subtitle: 'Directional Strength' },
  { key: 'chesta_bala', label: 'Chesta Bala', subtitle: 'Motional Strength' },
  { key: 'naisargika_bala', label: 'Naisargika Bala', subtitle: 'Natural Strength' },
] as const

function strengthColor(s: string) {
  if (s === 'Very Strong') return 'bg-gold-400/20 text-gold-400 border-gold-400/40'
  if (s === 'Strong') return 'bg-green-500/20 text-green-400 border-green-500/40'
  if (s === 'Moderate') return 'bg-saffron-700/20 text-saffron-400 border-saffron-600/40'
  return 'bg-red-500/10 text-red-400 border-red-400/30'
}

export default function ShadbalaPanel({ chartData }: { chartData: Record<string, unknown> }) {
  const { lang } = useLanguage()
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null)
  const [insight, setInsight] = useState('')
  const [loading, setLoading] = useState(false)

  const shadbala = chartData.shadbala as Record<string, ShadbalaEntry> | undefined
  if (!shadbala || Object.keys(shadbala).length === 0) {
    return (
      <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-6 text-gray-400">
        Shadbala data not available for this chart.
      </div>
    )
  }

  const planets = Object.keys(shadbala)
  const active = selectedPlanet && shadbala[selectedPlanet] ? shadbala[selectedPlanet] : null

  const fetchInsight = async () => {
    setLoading(true)
    setInsight('')
    try {
      const res = await fetch('/api/interpret-shadbala', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chart_data: chartData, language: lang }),
      })
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setInsight(prev => prev + decoder.decode(value))
      }
    } catch {
      setInsight('Could not load insight. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-6 space-y-5">
      <div>
        <h3 className="text-gold-400 font-bold text-lg mb-1">⚖️ Shadbala — Planetary Strength</h3>
        <p className="text-gray-500 text-xs">
          Shadbala measures each planet&apos;s combined strength across six dimensions. Higher total = stronger planetary influence in your life.
        </p>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {planets.map(p => {
          const entry = shadbala[p]
          return (
            <button
              key={p}
              onClick={() => setSelectedPlanet(selectedPlanet === p ? null : p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                selectedPlanet === p
                  ? 'bg-saffron-600 border-saffron-500 text-white'
                  : `${strengthColor(entry.strength)} hover:opacity-80`
              }`}
            >
              <span>{p}</span>
              <span className="opacity-70">{entry.total.toFixed(0)}</span>
            </button>
          )
        })}
      </div>

      {/* Planet breakdown */}
      {active && selectedPlanet && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 mb-1">
            <h4 className="text-gold-400 font-bold">{selectedPlanet}</h4>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${strengthColor(active.strength)}`}>
              {active.strength}
            </span>
            <span className="text-gray-400 text-sm ml-auto">Total: <strong className="text-white">{active.total.toFixed(1)}</strong></span>
          </div>
          {COMPONENTS.map(c => {
            const comp = active[c.key] as ShadbalaComponent
            return (
              <div key={c.key} className="bg-deepblue-950/60 border border-saffron-700/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-saffron-400 text-sm font-medium">{c.label}</span>
                    <span className="text-gray-600 text-xs ml-2">{c.subtitle}</span>
                  </div>
                  <span className="text-gold-400 font-bold text-sm">{comp.value.toFixed(1)}</span>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">{comp.description}</p>
              </div>
            )
          })}
        </div>
      )}

      {!selectedPlanet && (
        <p className="text-gray-600 text-xs text-center py-2">Click a planet above to see its full strength breakdown</p>
      )}

      {/* AI Insight */}
      <div className="pt-2 border-t border-saffron-700/20">
        {!insight && !loading && (
          <button
            onClick={fetchInsight}
            className="w-full py-2.5 bg-saffron-700/20 border border-saffron-600/40 text-saffron-400 hover:text-gold-400 hover:border-gold-400 rounded-lg text-sm transition"
          >
            ✨ Get AI Insight — What does this mean for me?
          </button>
        )}
        {loading && !insight && (
          <p className="text-saffron-400 text-sm animate-pulse text-center">Analysing your planetary strengths...</p>
        )}
        {insight && (
          <div className="space-y-3">
            <h4 className="text-gold-400 font-medium text-sm">✨ AI Shadbala Insight</h4>
            <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{insight}</div>
            <button onClick={fetchInsight} className="text-xs text-gray-500 hover:text-saffron-400 transition">↻ Refresh</button>
          </div>
        )}
      </div>
    </div>
  )
}

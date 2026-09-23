'use client'
import { useState } from 'react'
import { useLanguage } from './LanguageProvider'


interface Props {
  chartData: object
  selectedPlanet?: string | null
  selectedHouse?: number | null
  planets?: Record<string, { sign: string; house: number; degree: number }>
}

async function readStream(url: string, body: object, onChunk: (t: string) => void) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.detail || `Error ${res.status}`)
  }
  const reader = res.body!.getReader()
  const dec = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    onChunk(dec.decode(value, { stream: true }))
  }
}

export default function InterpretPanel({ chartData, selectedPlanet, planets }: Props) {
  const [interpretation, setInterpretation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { t, lang } = useLanguage()

  const fetchFull = async () => {
    setLoading(true)
    setError('')
    setInterpretation('')
    try {
      await readStream('/api/interpret-full', { ...chartData, language: lang }, chunk =>
        setInterpretation(prev => prev + chunk)
      )
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to get interpretation. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchPlacement = async () => {
    if (!selectedPlanet || !planets?.[selectedPlanet]) return
    const pd = planets[selectedPlanet]
    setLoading(true)
    setError('')
    setInterpretation('')
    try {
      await readStream('/api/interpret-placement', {
        planet: selectedPlanet, sign: pd.sign, house: pd.house, chart_data: chartData, language: lang,
      }, chunk => setInterpretation(prev => prev + chunk))
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to get interpretation. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-6">
      <h3 className="text-gold-400 font-bold text-lg mb-4">{t.interpret.title}</h3>
      <div className="flex gap-3 mb-4">
        <button
          onClick={fetchFull}
          disabled={loading}
          className="flex-1 bg-saffron-700 hover:bg-saffron-600 disabled:bg-saffron-900 text-white text-sm py-2 px-3 rounded-lg transition"
        >
          {t.interpret.fullReading}
        </button>
        {selectedPlanet && (
          <button
            onClick={fetchPlacement}
            disabled={loading}
            className="flex-1 bg-deepblue-950 border border-saffron-700/40 hover:border-gold-400 text-saffron-400 text-sm py-2 px-3 rounded-lg transition"
          >
            {t.interpret.explain} {selectedPlanet}
          </button>
        )}
      </div>
      {loading && !interpretation && (
        <div className="text-saffron-400 text-sm animate-pulse">{t.interpret.thinking}</div>
      )}
      {error && (
        <div className="text-red-400 text-sm bg-red-900/20 border border-red-700/30 rounded-lg p-3 mt-2">
          {error}
        </div>
      )}
      {interpretation && (
        <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-line max-h-80 overflow-y-auto pr-2">
          {interpretation}{loading && <span className="animate-pulse">▍</span>}
        </div>
      )}
      {!interpretation && !error && !loading && (
        <p className="text-gray-500 text-sm">{t.interpret.placeholder}</p>
      )}
    </div>
  )
}

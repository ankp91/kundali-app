'use client'
import { useState } from 'react'
import KundaliChart from '@/components/KundaliChart'
import PlanetTable from '@/components/PlanetTable'
import { useLanguage } from '@/components/LanguageProvider'

export default function PrasnaPage() {
  const { lang } = useLanguage()
  const [question, setQuestion] = useState('')
  const [place, setPlace] = useState('')
  const [loading, setLoading] = useState(false)
  const [chart, setChart] = useState<Record<string, unknown> | null>(null)
  const [reading, setReading] = useState('')
  const [readingLoading, setReadingLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || !place.trim()) return
    setLoading(true)
    setError('')
    setChart(null)
    setReading('')
    try {
      const res = await fetch('/api/prasna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, birth_place: place, language: lang }),
      })
      if (!res.ok) throw new Error('Failed to cast chart')
      const data = await res.json()
      setChart(data)
      // Auto-start reading
      streamReading(question, data)
    } catch {
      setError('Could not cast the prasna chart. Please check the location and try again.')
    } finally {
      setLoading(false)
    }
  }

  const streamReading = async (q: string, chartData: Record<string, unknown>) => {
    setReadingLoading(true)
    setReading('')
    try {
      const res = await fetch('/api/interpret-prasna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, chart_data: chartData, language: lang }),
      })
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setReading(prev => prev + decoder.decode(value))
      }
    } catch {
      setReading('Could not generate reading. Please try again.')
    } finally {
      setReadingLoading(false)
    }
  }

  const houses = chart?.houses as Record<string, { sign: string; sign_hindi: string; planets: string[] }> | undefined
  const planets = chart?.planets as Record<string, { sign: string; sign_hindi: string; house: number; degree: number; nakshatra: string; pada: number; is_retrograde: boolean }> | undefined
  const ascendant = chart?.ascendant as { sign: string; sign_hindi: string; degree: number } | undefined

  const housesNum: Record<number, { sign: string; sign_hindi: string; planets: string[] }> = {}
  if (houses) {
    Object.entries(houses).forEach(([k, v]) => { housesNum[parseInt(k)] = v })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gold-400 mb-2">🔮 Prasna — Horary Astrology</h1>
        <p className="text-gray-400">
          Ask a question about your present situation. A chart is cast for this exact moment to reveal the answer.
        </p>
      </div>

      {!chart && (
        <div className="bg-deepblue-900 border border-saffron-700/40 rounded-2xl p-8 max-w-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-saffron-400 text-sm mb-2">Your Question</label>
              <textarea
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="e.g. Will I get the job? Should I travel now? When will I meet my partner?"
                rows={3}
                required
                className="w-full bg-deepblue-950 border border-saffron-700/40 rounded-lg px-4 py-2 text-white focus:border-gold-400 focus:outline-none resize-none text-sm"
              />
            </div>
            <div>
              <label className="block text-saffron-400 text-sm mb-2">Your Current Location</label>
              <input
                type="text"
                value={place}
                onChange={e => setPlace(e.target.value)}
                placeholder="e.g. Mumbai, London, New York"
                required
                className="w-full bg-deepblue-950 border border-saffron-700/40 rounded-lg px-4 py-2 text-white focus:border-gold-400 focus:outline-none text-sm"
              />
              <p className="text-gray-600 text-xs mt-1">The chart is cast for right now at this location.</p>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-saffron-600 hover:bg-saffron-500 disabled:bg-saffron-800 text-white font-bold py-3 rounded-lg transition"
            >
              {loading ? '⏳ Casting Chart...' : '🔮 Cast Chart'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-deepblue-950/60 border border-saffron-700/20 rounded-lg">
            <p className="text-gray-500 text-xs leading-relaxed">
              <strong className="text-saffron-400">How Prasna works:</strong> In Vedic astrology, a horary chart is cast for the exact moment a sincere question is asked. The rising sign, Moon placement, and planetary positions at that moment contain the answer. This ancient technique — described in Prasna Marga — can reveal outcomes for questions about career, relationships, health, travel, and more.
            </p>
          </div>
        </div>
      )}

      {chart && ascendant && planets && (
        <div className="space-y-6">
          <div className="bg-deepblue-900/50 border border-saffron-700/20 rounded-xl p-4">
            <p className="text-saffron-400 text-sm font-medium mb-1">Question: <span className="text-white">{chart.question as string}</span></p>
            <p className="text-gray-500 text-xs">
              Chart cast for {chart.return_date as string} at {chart.return_time as string} UTC
            </p>
            <p className="text-gray-600 text-xs mt-1">
              This chart reflects the moment of your question. The rising sign and planetary positions reveal the answer&apos;s energy.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-center">
                <KundaliChart
                  id="prasna-chart"
                  houses={housesNum}
                  ascendant={ascendant}
                  name="Prasna"
                  size={340}
                />
              </div>
              <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-4">
                <h3 className="text-gold-400 font-bold mb-3">Planetary Positions</h3>
                <PlanetTable planets={planets} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-5">
                <h3 className="text-gold-400 font-bold text-lg mb-3">🔮 Prasna Reading</h3>
                {readingLoading && !reading && (
                  <p className="text-saffron-400 text-sm animate-pulse">The Jyotishi is consulting the stars...</p>
                )}
                {reading && (
                  <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{reading}</div>
                )}
              </div>

              <button
                onClick={() => { setChart(null); setReading(''); setQuestion(''); setPlace('') }}
                className="text-sm text-gray-500 hover:text-saffron-400 transition"
              >
                ← Ask another question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

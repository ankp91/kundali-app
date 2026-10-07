'use client'
import { useState } from 'react'
import { useLanguage } from './LanguageProvider'

export default function RemediesPanel({ chartData }: { chartData: Record<string, unknown> }) {
  const { lang } = useLanguage()
  const [remedies, setRemedies] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchRemedies = async () => {
    setLoading(true)
    setRemedies('')
    try {
      const res = await fetch('/api/remedies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chart_data: chartData, language: lang }),
      })
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setRemedies(prev => prev + decoder.decode(value))
      }
    } catch {
      setRemedies('Could not load remedies. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-6">
      <h3 className="text-gold-400 font-bold text-lg mb-2">🙏 Personalised Remedies (Upayas)</h3>
      <p className="text-gray-500 text-xs mb-4">
        Vedic astrology prescribes specific remedies — mantras, donations, and behavioural practices — to strengthen weak planets and resolve karmic patterns.
      </p>

      {!remedies && !loading && (
        <button
          onClick={fetchRemedies}
          className="w-full py-3 bg-saffron-700/20 border border-saffron-600/40 text-saffron-400 hover:text-gold-400 hover:border-gold-400 rounded-lg text-sm transition"
        >
          🔮 Generate My Remedies
        </button>
      )}

      {loading && !remedies && (
        <p className="text-saffron-400 text-sm animate-pulse">Jyotish Guru is preparing your personalised upayas...</p>
      )}

      {remedies && (
        <div className="space-y-4">
          <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{remedies}</div>
          <button
            onClick={fetchRemedies}
            className="text-xs text-gray-500 hover:text-saffron-400 transition"
          >
            ↻ Refresh
          </button>
        </div>
      )}
    </div>
  )
}

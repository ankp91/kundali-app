'use client'
import { useState } from 'react'
import axios from 'axios'

const API = process.env.NEXT_PUBLIC_API_URL

interface Props {
  chartData: object
  selectedPlanet?: string | null
  selectedHouse?: number | null
  planets?: Record<string, { sign: string; house: number; degree: number }>
}

export default function InterpretPanel({ chartData, selectedPlanet, planets }: Props) {
  const [interpretation, setInterpretation] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchFull = async () => {
    setLoading(true)
    try {
      const { data } = await axios.post(`${API}/api/interpret-full`, chartData)
      setInterpretation(data.interpretation)
    } finally {
      setLoading(false)
    }
  }

  const fetchPlacement = async () => {
    if (!selectedPlanet || !planets?.[selectedPlanet]) return
    const pd = planets[selectedPlanet]
    setLoading(true)
    try {
      const { data } = await axios.post(`${API}/api/interpret-placement`, {
        planet: selectedPlanet,
        sign: pd.sign,
        house: pd.house,
        chart_data: chartData,
      })
      setInterpretation(data.interpretation)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-6">
      <h3 className="text-gold-400 font-bold text-lg mb-4">AI Interpretation</h3>
      <div className="flex gap-3 mb-4">
        <button
          onClick={fetchFull}
          disabled={loading}
          className="flex-1 bg-saffron-700 hover:bg-saffron-600 disabled:bg-saffron-900 text-white text-sm py-2 px-3 rounded-lg transition"
        >
          Full Chart Reading
        </button>
        {selectedPlanet && (
          <button
            onClick={fetchPlacement}
            disabled={loading}
            className="flex-1 bg-deepblue-950 border border-saffron-700/40 hover:border-gold-400 text-saffron-400 text-sm py-2 px-3 rounded-lg transition"
          >
            Explain {selectedPlanet}
          </button>
        )}
      </div>
      {loading && (
        <div className="text-saffron-400 text-sm animate-pulse">Jyotish Guru is reading your chart...</div>
      )}
      {interpretation && !loading && (
        <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-line max-h-80 overflow-y-auto pr-2">
          {interpretation}
        </div>
      )}
      {!interpretation && !loading && (
        <p className="text-gray-500 text-sm">Click a planet in the table or request a full chart reading above.</p>
      )}
    </div>
  )
}

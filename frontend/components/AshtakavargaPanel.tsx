'use client'
import { useState } from 'react'

const SIGNS = ['Ari','Tau','Gem','Can','Leo','Vir','Lib','Sco','Sag','Cap','Aqu','Pis']
const PLANET_COLOR: Record<string, string> = {
  Sun: '#FF8040', Moon: '#C8C8C8', Mercury: '#48C840', Venus: '#FF70B0',
  Mars: '#FF3838', Jupiter: '#FFD700', Saturn: '#6080FF',
}

interface AvData {
  sign_scores: number[]
  total: number
}

interface AshtakavargaData {
  [planet: string]: AvData
  sarvashtakavarga: AvData
}

function ScoreBar({ score, max = 8 }: { score: number; max?: number }) {
  const pct = (score / max) * 100
  const color = score >= 5 ? 'bg-emerald-500' : score >= 4 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-2 bg-deepblue-950 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold w-4 text-right ${score >= 5 ? 'text-emerald-400' : score >= 4 ? 'text-yellow-400' : 'text-red-400'}`}>{score}</span>
    </div>
  )
}

export default function AshtakavargaPanel({ chartData }: { chartData: Record<string, unknown> }) {
  const av = chartData.ashtakavarga as AshtakavargaData | undefined
  const [selected, setSelected] = useState('sarvashtakavarga')

  if (!av) {
    return (
      <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-6">
        <h3 className="text-gold-400 font-bold text-lg mb-2">Ashtakavarga</h3>
        <p className="text-gray-400 text-sm">Ashtakavarga data not available. Regenerate your chart to include it.</p>
      </div>
    )
  }

  const planets = Object.keys(av).filter(k => k !== 'sarvashtakavarga')
  const displayData = av[selected]
  const maxScore = selected === 'sarvashtakavarga' ? 56 : 8

  return (
    <div className="space-y-4">
      <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-4">
        <h3 className="text-gold-400 font-bold text-lg mb-3">Ashtakavarga — Planetary Strength by Sign</h3>
        <p className="text-gray-500 text-xs mb-4">Points scored by each planet in each sign. Higher = stronger transits and placements. 5+ is auspicious; below 4 is challenging.</p>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setSelected('sarvashtakavarga')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${selected === 'sarvashtakavarga' ? 'bg-gold-400/20 text-gold-400 border border-gold-400/40' : 'text-gray-400 border border-saffron-700/20 hover:border-saffron-600'}`}
          >
            Sarva (Total)
          </button>
          {planets.map(p => (
            <button
              key={p}
              onClick={() => setSelected(p)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${selected === p ? 'border' : 'text-gray-400 border border-saffron-700/20 hover:border-saffron-600'}`}
              style={selected === p ? { color: PLANET_COLOR[p] || '#aaa', borderColor: PLANET_COLOR[p] || '#aaa', backgroundColor: `${PLANET_COLOR[p]}20` } : {}}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {SIGNS.map((sign, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-saffron-400/70 text-xs w-7">{sign}</span>
              <div className="flex-1">
                <ScoreBar score={displayData.sign_scores[i]} max={maxScore} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t border-saffron-700/20 flex justify-between text-xs">
          <span className="text-gray-500">Total bindus: <span className="text-gold-400 font-bold">{displayData.total}</span></span>
          {selected === 'sarvashtakavarga' && (
            <span className="text-gray-500">Avg per sign: <span className="text-saffron-400">{(displayData.total / 12).toFixed(1)}</span></span>
          )}
        </div>
      </div>

      <div className="bg-deepblue-900/60 border border-saffron-700/20 rounded-xl p-3 text-xs text-gray-400">
        <span className="text-saffron-400 font-medium">How to read:</span> When a planet transits a sign with <span className="text-emerald-400">5+ points</span>, its results are strongly favourable. Sarvashtakavarga shows which signs are generally powerful for you across all planets.
      </div>
    </div>
  )
}

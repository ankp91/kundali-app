'use client'
import { useState } from 'react'
import KundaliChart from './KundaliChart'
import { useLanguage } from './LanguageProvider'

interface DivHouseData {
  sign: string
  sign_hindi: string
  sign_num: number
  planets: string[]
}

interface DivisionalData {
  ascendant: { sign: string; sign_hindi: string; sign_num: number; degree: number }
  houses: Record<number | string, DivHouseData>
}

interface Props {
  d9: DivisionalData
  d10: DivisionalData
  d7: DivisionalData
  d12: DivisionalData
  fullChart: Record<string, unknown>
}

const CHARTS = [
  { key: 'd9' as const,  id: 'chart-d9',  label: 'D9',  title: 'Navamsa',     sub: 'Marriage · Spiritual self · Dharma' },
  { key: 'd10' as const, id: 'chart-d10', label: 'D10', title: 'Dasamsa',     sub: 'Career · Profession · Public life' },
  { key: 'd7' as const,  id: 'chart-d7',  label: 'D7',  title: 'Saptamsa',    sub: 'Children · Progeny · Creativity' },
  { key: 'd12' as const, id: 'chart-d12', label: 'D12', title: 'Dwadasamsa',  sub: 'Parents · Ancestry · Karma' },
]

function toHousesNum(houses: Record<number | string, DivHouseData>) {
  const result: Record<number, { sign: string; sign_hindi: string; planets: string[] }> = {}
  Object.entries(houses).forEach(([k, v]) => {
    result[parseInt(k)] = { sign: v.sign, sign_hindi: v.sign_hindi, planets: v.planets }
  })
  return result
}

export default function DivisionalCharts({ d9, d10, d7, d12, fullChart }: Props) {
  const { lang } = useLanguage()
  const data = { d9, d10, d7, d12 }
  const [interpretations, setInterpretations] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const interpret = async (key: string, divData: DivisionalData) => {
    if (interpretations[key]) {
      setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
      return
    }
    setLoading(prev => ({ ...prev, [key]: true }))
    setExpanded(prev => ({ ...prev, [key]: true }))
    setInterpretations(prev => ({ ...prev, [key]: '' }))

    try {
      const res = await fetch('/api/interpret-divisional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          div_type: key,
          div_data: divData,
          d1_chart: fullChart,
          language: lang,
        }),
      })
      if (!res.ok || !res.body) throw new Error('Request failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let text = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
        setInterpretations(prev => ({ ...prev, [key]: text }))
      }
    } catch {
      setInterpretations(prev => ({ ...prev, [key]: 'Could not load interpretation. Please try again.' }))
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {CHARTS.map(({ key, id, label, title, sub }) => {
        const chart = data[key]
        const isExpanded = expanded[key]
        const isLoading = loading[key]
        const text = interpretations[key]

        return (
          <div key={key} className="bg-deepblue-900 border border-saffron-700/30 rounded-xl overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-gold-400 font-bold text-sm">{label}</span>
                    <span className="text-saffron-400 text-sm font-medium">— {title}</span>
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5">{sub}</p>
                </div>
                <button
                  onClick={() => interpret(key, chart)}
                  className="flex-shrink-0 text-xs px-3 py-1 rounded-lg border border-saffron-700/40 hover:border-gold-400 text-saffron-400 hover:text-gold-400 transition"
                >
                  {isLoading ? '...' : text ? (isExpanded ? 'Hide' : 'Show reading') : 'Interpret'}
                </button>
              </div>

              <div className="flex justify-center mt-3">
                <KundaliChart
                  id={id}
                  houses={toHousesNum(chart.houses)}
                  ascendant={chart.ascendant}
                  label={label}
                  size={260}
                />
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-saffron-700/20 px-4 py-4">
                {isLoading && !text ? (
                  <p className="text-saffron-400 text-sm animate-pulse">Reading the {title} chart...</p>
                ) : (
                  <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{text}</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

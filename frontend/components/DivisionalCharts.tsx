'use client'
import KundaliChart from './KundaliChart'

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
}

const CHARTS = [
  { key: 'd9' as const, id: 'chart-d9', label: 'D9', title: 'Navamsa', sub: 'Marriage · Spiritual self · Dharma' },
  { key: 'd10' as const, id: 'chart-d10', label: 'D10', title: 'Dasamsa', sub: 'Career · Profession · Public life' },
  { key: 'd7' as const, id: 'chart-d7', label: 'D7', title: 'Saptamsa', sub: 'Children · Progeny · Creativity' },
  { key: 'd12' as const, id: 'chart-d12', label: 'D12', title: 'Dwadasamsa', sub: 'Parents · Ancestry · Karma' },
]

function toHousesNum(houses: Record<number | string, DivHouseData>) {
  const result: Record<number, { sign: string; sign_hindi: string; planets: string[] }> = {}
  Object.entries(houses).forEach(([k, v]) => {
    result[parseInt(k)] = { sign: v.sign, sign_hindi: v.sign_hindi, planets: v.planets }
  })
  return result
}

export default function DivisionalCharts({ d9, d10, d7, d12 }: Props) {
  const data = { d9, d10, d7, d12 }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {CHARTS.map(({ key, id, label, title, sub }) => {
        const chart = data[key]
        return (
          <div key={key} className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-4">
            <div className="mb-3">
              <div className="flex items-baseline gap-2">
                <span className="text-gold-400 font-bold text-sm">{label}</span>
                <span className="text-saffron-400 text-sm font-medium">— {title}</span>
              </div>
              <p className="text-gray-500 text-xs mt-0.5">{sub}</p>
            </div>
            <div className="flex justify-center">
              <KundaliChart
                id={id}
                houses={toHousesNum(chart.houses)}
                ascendant={chart.ascendant}
                label={label}
                size={280}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

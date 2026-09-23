'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import KundaliChart from '@/components/KundaliChart'
import PlanetTable from '@/components/PlanetTable'
import InterpretPanel from '@/components/InterpretPanel'
import ChatBot from '@/components/ChatBot'
import { useLanguage } from '@/components/LanguageProvider'

export default function ChartPage() {
  const router = useRouter()
  const [chart, setChart] = useState<Record<string, unknown> | null>(null)
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null)
  const [selectedHouse, setSelectedHouse] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'interpret' | 'chat' | 'dasha'>('interpret')
  const { t } = useLanguage()

  useEffect(() => {
    const stored = sessionStorage.getItem('kundali')
    if (!stored) { router.push('/'); return }
    setChart(JSON.parse(stored))
  }, [router])

  if (!chart) return (
    <div className="flex items-center justify-center h-64 text-saffron-400">{t.chart.loading}</div>
  )

  const houses = chart.houses as Record<string, { sign: string; sign_hindi: string; planets: string[] }>
  const planets = chart.planets as Record<string, { sign: string; sign_hindi: string; house: number; degree: number; nakshatra: string; pada: number; is_retrograde: boolean }>
  const ascendant = chart.ascendant as { sign: string; sign_hindi: string; degree: number }
  const dashas = chart.dashas as Array<{ lord: string; years: number; start: string; end: string; is_current: boolean }>

  const housesNum: Record<number, { sign: string; sign_hindi: string; planets: string[] }> = {}
  Object.entries(houses || {}).forEach(([k, v]) => { housesNum[parseInt(k)] = v })

  const tabs = [
    { key: 'interpret', label: t.chart.interpret },
    { key: 'chat', label: t.chart.chat },
    { key: 'dasha', label: t.chart.dasha },
  ] as const

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push('/')} className="text-saffron-400 hover:text-gold-400">{t.chart.newChart}</button>
        <h1 className="text-2xl font-bold text-gold-400">
          {chart.name as string || 'Kundali'} — {t.chart.birthChart}
        </h1>
        {!!chart.birth_info && (
          <span className="text-gray-400 text-sm">
            {(chart.birth_info as { date: string; place: string }).date} · {(chart.birth_info as { date: string; place: string }).place}
          </span>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="flex justify-center">
            <KundaliChart
              houses={housesNum}
              ascendant={ascendant}
              name={chart.name as string}
              size={400}
              onHouseClick={setSelectedHouse}
              selectedHouse={selectedHouse}
            />
          </div>
          <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-4">
            <h3 className="text-gold-400 font-bold mb-3">{t.chart.planetaryPositions}</h3>
            <PlanetTable
              planets={planets}
              onPlanetClick={(name) => setSelectedPlanet(name)}
              selectedPlanet={selectedPlanet}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === tab.key
                    ? 'bg-saffron-600 text-white'
                    : 'bg-deepblue-900 border border-saffron-700/30 text-saffron-400 hover:border-gold-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'interpret' && (
            <InterpretPanel
              chartData={chart}
              selectedPlanet={selectedPlanet}
              selectedHouse={selectedHouse}
              planets={planets}
            />
          )}

          {activeTab === 'chat' && <ChatBot chartData={chart} />}

          {activeTab === 'dasha' && dashas && (
            <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-6">
              <h3 className="text-gold-400 font-bold text-lg mb-4">{t.chart.vimshottariDasha}</h3>
              <div className="space-y-2">
                {dashas.map((d, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      d.is_current ? 'bg-saffron-700/20 border border-saffron-600/40' : 'bg-deepblue-950/50'
                    }`}
                  >
                    {d.is_current && <span className="w-2 h-2 bg-saffron-400 rounded-full flex-shrink-0" />}
                    <div className="flex-1">
                      <span className="text-gold-400 font-medium">{d.lord} Dasha</span>
                      <span className="text-gray-400 text-sm ml-2">({d.years} {t.chart.yrs})</span>
                    </div>
                    <div className="text-gray-500 text-xs">{d.start} – {d.end}</div>
                    {d.is_current && <span className="text-saffron-400 text-xs font-bold">{t.chart.current}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

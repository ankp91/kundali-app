'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import KundaliChart from '@/components/KundaliChart'
import PlanetTable from '@/components/PlanetTable'
import InterpretPanel from '@/components/InterpretPanel'
import ChatBot from '@/components/ChatBot'
import DivisionalCharts from '@/components/DivisionalCharts'
import TransitsPanel from '@/components/TransitsPanel'
import AshtakavargaPanel from '@/components/AshtakavargaPanel'
import RemediesPanel from '@/components/RemediesPanel'
import ShadbalaPanel from '@/components/ShadbalaPanel'
import TransitCalendarPanel from '@/components/TransitCalendarPanel'
import { useLanguage } from '@/components/LanguageProvider'
import { downloadKundaliPDF } from '@/lib/downloadPDF'

interface SavedKundali {
  id: string; name: string; date: string; place: string; savedAt: string; chart: Record<string, unknown>
}

interface Antardasha {
  lord: string; years: number; start: string; end: string; is_current: boolean
}

interface Dasha {
  lord: string; years: number; start: string; end: string; is_current: boolean; antardashas?: Antardasha[]
}

export default function ChartPage() {
  const router = useRouter()
  const [chart, setChart] = useState<Record<string, unknown> | null>(null)
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null)
  const [selectedHouse, setSelectedHouse] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'interpret' | 'chat' | 'dasha' | 'divisionals' | 'yogas' | 'transits' | 'ashtakavarga' | 'remedies' | 'shadbala' | 'transit-calendar'>('interpret')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [copyLinkMsg, setCopyLinkMsg] = useState<string | null>(null)
  const [whatsappMsg, setWhatsappMsg] = useState<string | null>(null)
  const [selectedDasha, setSelectedDasha] = useState<number | null>(null)
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
  const dashas = chart.dashas as Dasha[]

  const housesNum: Record<number, { sign: string; sign_hindi: string; planets: string[] }> = {}
  Object.entries(houses || {}).forEach(([k, v]) => { housesNum[parseInt(k)] = v })

  const handleSave = () => {
    if (!chart) return
    const raw = localStorage.getItem('saved_kundalis')
    const existing: SavedKundali[] = raw ? JSON.parse(raw) : []
    const entry: SavedKundali = {
      id: Date.now().toString(),
      name: (chart.name as string) || 'Unknown',
      date: (chart.birth_info as { date: string })?.date || '',
      place: (chart.birth_info as { place: string })?.place || '',
      savedAt: new Date().toISOString(),
      chart,
    }
    const updated = [entry, ...existing].slice(0, 10)
    localStorage.setItem('saved_kundalis', JSON.stringify(updated))
    setSaveMsg('Saved!')
    setTimeout(() => setSaveMsg(null), 2000)
  }

  const handleShareImage = async () => {
    const { toPng } = await import('html-to-image')
    const el = document.getElementById('chart-d1')
    if (!el) return
    const dataUrl = await toPng(el, { backgroundColor: '#0c1445' })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `${(chart?.name as string) || 'kundali'}-chart.png`
    a.click()
  }

  const handleDownloadPDF = async () => {
    if (!chart) return
    setPdfLoading(true)
    try {
      await downloadKundaliPDF(chart)
    } finally {
      setPdfLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (!chart) return
    const bi = chart.birth_info as { date: string; time: string; place: string } | undefined
    const name = (chart.name as string) || ''
    const url = `${window.location.origin}/?n=${encodeURIComponent(name)}&bd=${bi?.date || ''}&bt=${encodeURIComponent(bi?.time || '')}&bp=${encodeURIComponent(bi?.place || '')}`
    await navigator.clipboard.writeText(url)
    setCopyLinkMsg('✓ Copied!')
    setTimeout(() => setCopyLinkMsg(null), 2000)
  }

  const handleWhatsapp = async () => {
    if (!chart) return
    const bi = chart.birth_info as { date: string; time: string; place: string } | undefined
    const name = (chart.name as string) || ''
    const asc = chart.ascendant as { sign: string } | undefined
    const pl = chart.planets as Record<string, { sign: string; nakshatra: string }> | undefined
    const ds = chart.dashas as Array<{ lord: string; is_current: boolean; antardashas?: Array<{ lord: string; is_current: boolean }> }> | undefined
    const yogas = chart.yogas as Array<{ name: string }> | undefined

    const currentDasha = ds?.find(d => d.is_current)
    const currentAntardasha = currentDasha?.antardashas?.find(a => a.is_current)

    const url = `${window.location.origin}/?n=${encodeURIComponent(name)}&bd=${bi?.date || ''}&bt=${encodeURIComponent(bi?.time || '')}&bp=${encodeURIComponent(bi?.place || '')}`

    const summary = [
      `🔱 *${name}'s Kundali*`,
      '',
      `⬆️ Ascendant: ${asc?.sign || 'N/A'}`,
      `🌙 Moon: ${pl?.Moon?.sign || 'N/A'} (${pl?.Moon?.nakshatra || 'N/A'})`,
      `☀️ Sun: ${pl?.Sun?.sign || 'N/A'}`,
      '',
      `📅 Current Dasha: ${currentDasha?.lord || 'N/A'} Dasha`,
      `   ↳ Antardasha: ${currentAntardasha?.lord || 'N/A'}`,
      '',
      `✨ Top Yoga: ${yogas?.[0]?.name || 'None detected'}`,
      '',
      `🌐 Full Chart: ${url}`,
    ].join('\n')

    await navigator.clipboard.writeText(summary)
    setWhatsappMsg('✓ Copied!')
    setTimeout(() => setWhatsappMsg(null), 2000)
  }

  const tabs = [
    { key: 'interpret', label: t.chart.interpret },
    { key: 'chat', label: t.chart.chat },
    { key: 'dasha', label: t.chart.dasha },
    { key: 'divisionals', label: 'Divisionals' },
    { key: 'yogas', label: 'Yogas' },
    { key: 'transits', label: 'Transits' },
    { key: 'ashtakavarga', label: 'Ashtakavarga' },
    { key: 'remedies', label: 'Remedies' },
    { key: 'shadbala', label: 'Shadbala' },
    { key: 'transit-calendar', label: 'Transit Cal' },
  ] as const

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8 flex-wrap">
        <button onClick={() => router.push('/')} className="text-saffron-400 hover:text-gold-400">{t.chart.newChart}</button>
        <h1 className="text-2xl font-bold text-gold-400">
          {chart.name as string || 'Kundali'} — {t.chart.birthChart}
        </h1>
        {!!chart.birth_info && (
          <span className="text-gray-400 text-sm">
            {(chart.birth_info as { date: string; place: string }).date} · {(chart.birth_info as { date: string; place: string }).place}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-deepblue-900 border border-saffron-700/40 hover:border-gold-400 text-saffron-400 hover:text-gold-400 text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            {saveMsg || '🔖 Save'}
          </button>
          <button
            onClick={handleShareImage}
            className="flex items-center gap-2 bg-deepblue-900 border border-saffron-700/40 hover:border-gold-400 text-saffron-400 hover:text-gold-400 text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            📷 Share
          </button>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 bg-deepblue-900 border border-saffron-700/40 hover:border-gold-400 text-saffron-400 hover:text-gold-400 text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            {copyLinkMsg || '🔗 Copy Link'}
          </button>
          <button
            onClick={handleWhatsapp}
            className="flex items-center gap-2 bg-deepblue-900 border border-saffron-700/40 hover:border-gold-400 text-saffron-400 hover:text-gold-400 text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            {whatsappMsg || '💬 WhatsApp'}
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            className="flex items-center gap-2 bg-deepblue-900 border border-saffron-700/40 hover:border-gold-400 text-saffron-400 hover:text-gold-400 text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            {pdfLoading ? '⏳ Generating...' : '⬇ Download PDF'}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="flex justify-center">
            <KundaliChart
              id="chart-d1"
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
          <div className="flex flex-wrap gap-1.5">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
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

          {activeTab === 'divisionals' && !!chart.d9 && (
            <DivisionalCharts
              d9={chart.d9 as Parameters<typeof DivisionalCharts>[0]['d9']}
              d10={chart.d10 as Parameters<typeof DivisionalCharts>[0]['d10']}
              d7={chart.d7 as Parameters<typeof DivisionalCharts>[0]['d7']}
              d12={chart.d12 as Parameters<typeof DivisionalCharts>[0]['d12']}
              d2={chart.d2 as Parameters<typeof DivisionalCharts>[0]['d9']}
              d3={chart.d3 as Parameters<typeof DivisionalCharts>[0]['d9']}
              d60={chart.d60 as Parameters<typeof DivisionalCharts>[0]['d9']}
              fullChart={chart}
            />
          )}

          {activeTab === 'dasha' && dashas && (
            <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-6">
              <h3 className="text-gold-400 font-bold text-lg mb-4">{t.chart.vimshottariDasha}</h3>
              <p className="text-gray-500 text-xs mb-3">Click a dasha to see its antardashas (sub-periods)</p>
              <div className="space-y-2">
                {dashas.map((d, i) => (
                  <div key={i}>
                    <div
                      onClick={() => setSelectedDasha(selectedDasha === i ? null : i)}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                        d.is_current ? 'bg-saffron-700/20 border border-saffron-600/40' : 'bg-deepblue-950/50 hover:bg-deepblue-950'
                      }`}
                    >
                      {d.is_current && <span className="w-2 h-2 bg-saffron-400 rounded-full flex-shrink-0" />}
                      <div className="flex-1">
                        <span className="text-gold-400 font-medium">{d.lord} Dasha</span>
                        <span className="text-gray-400 text-sm ml-2">({d.years} {t.chart.yrs})</span>
                      </div>
                      <div className="text-gray-500 text-xs">{d.start} – {d.end}</div>
                      {d.is_current && <span className="text-saffron-400 text-xs font-bold">{t.chart.current}</span>}
                      <span className="text-gray-600 text-xs ml-1">{selectedDasha === i ? '▲' : '▼'}</span>
                    </div>
                    {selectedDasha === i && d.antardashas && (
                      <div className="ml-4 mt-1 space-y-1 border-l border-saffron-700/20 pl-3">
                        {d.antardashas.map((ad, j) => (
                          <div
                            key={j}
                            className={`flex items-center gap-2 py-1.5 px-2 rounded text-xs ${
                              ad.is_current ? 'bg-gold-400/10 border border-gold-400/20' : 'text-gray-500'
                            }`}
                          >
                            {ad.is_current && <span className="w-1.5 h-1.5 bg-gold-400 rounded-full flex-shrink-0" />}
                            <span className={ad.is_current ? 'text-gold-400 font-medium' : 'text-gray-400'}>
                              {ad.lord} Antardasha
                            </span>
                            <span className="text-gray-600">({ad.years} yrs)</span>
                            <span className="ml-auto text-gray-600">{ad.start} – {ad.end}</span>
                            {ad.is_current && <span className="text-gold-400 font-bold text-xs">●</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'yogas' && (() => {
            const yogas = chart.yogas as Array<{name: string; description: string; strength: string; planets: string[]}> | undefined
            return (
              <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-6">
                <h3 className="text-gold-400 font-bold text-lg mb-4">✨ Yogas in Your Chart</h3>
                {!yogas || yogas.length === 0 ? (
                  <p className="text-gray-400">No major yogas detected in this chart.</p>
                ) : (
                  <div className="space-y-3">
                    {yogas.map((yoga, i) => (
                      <div key={i} className={`p-4 rounded-lg border ${
                        yoga.strength === 'strong' ? 'border-gold-400/40 bg-gold-400/5' :
                        yoga.strength === 'challenging' ? 'border-red-400/30 bg-red-400/5' :
                        'border-saffron-700/30 bg-deepblue-950/50'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-gold-400 font-bold">{yoga.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            yoga.strength === 'strong' ? 'bg-gold-400/20 text-gold-400' :
                            yoga.strength === 'challenging' ? 'bg-red-400/20 text-red-400' :
                            'bg-saffron-700/20 text-saffron-400'
                          }`}>{yoga.strength}</span>
                        </div>
                        <p className="text-gray-300 text-sm">{yoga.description}</p>
                        {yoga.planets.length > 0 && (
                          <p className="text-gray-500 text-xs mt-1">Planets: {yoga.planets.join(', ')}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}

          {activeTab === 'transits' && (
            <TransitsPanel chartData={chart} />
          )}

          {activeTab === 'ashtakavarga' && (
            <AshtakavargaPanel chartData={chart} />
          )}

          {activeTab === 'remedies' && (
            <RemediesPanel chartData={chart} />
          )}

          {activeTab === 'shadbala' && (
            <ShadbalaPanel chartData={chart} />
          )}

          {activeTab === 'transit-calendar' && (
            <TransitCalendarPanel chartData={chart} />
          )}
        </div>
      </div>

      {/* Hidden charts kept in DOM so PDF can capture them by id */}
      {!!chart.d9 && activeTab !== 'divisionals' && (
        <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: 0, pointerEvents: 'none' }}>
          <DivisionalCharts
            d9={chart.d9 as Parameters<typeof DivisionalCharts>[0]['d9']}
            d10={chart.d10 as Parameters<typeof DivisionalCharts>[0]['d10']}
            d7={chart.d7 as Parameters<typeof DivisionalCharts>[0]['d7']}
            d12={chart.d12 as Parameters<typeof DivisionalCharts>[0]['d12']}
            d2={chart.d2 as Parameters<typeof DivisionalCharts>[0]['d9']}
            d3={chart.d3 as Parameters<typeof DivisionalCharts>[0]['d9']}
            d60={chart.d60 as Parameters<typeof DivisionalCharts>[0]['d9']}
            fullChart={chart}
          />
        </div>
      )}
    </div>
  )
}

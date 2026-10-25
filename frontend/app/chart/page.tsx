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

interface DoshaResult {
  mangal_dosha: { present: boolean; mars_house: number; severity: string; description: string }
  kal_sarpa: { present: boolean; partial: boolean; type: string; rahu_sign: string; ketu_sign: string }
  sade_sati: { active: boolean; phase: string; natal_moon_sign: string; current_saturn_sign: string; years_remaining: string; small_panoti: boolean; small_panoti_type: string }
}

interface SaturnEvent {
  type: string
  phase: string
  sign: string
  start: string
  end: string
  is_current: boolean
  intensity: 'high' | 'medium'
}

export default function ChartPage() {
  const router = useRouter()
  const [chart, setChart] = useState<Record<string, unknown> | null>(null)
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null)
  const [selectedHouse, setSelectedHouse] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'interpret' | 'chat' | 'dasha' | 'divisionals' | 'yogas' | 'transits' | 'ashtakavarga' | 'remedies' | 'shadbala' | 'transit-calendar' | 'doshas'>('interpret')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [copyLinkMsg, setCopyLinkMsg] = useState<string | null>(null)
  const [whatsappMsg, setWhatsappMsg] = useState<string | null>(null)
  const [selectedDasha, setSelectedDasha] = useState<number | null>(null)
  const [doshaData, setDoshaData] = useState<DoshaResult | null>(null)
  const [doshaLoading, setDoshaLoading] = useState(false)
  const [doshaError, setDoshaError] = useState<string | null>(null)
  const [saturnEvents, setSaturnEvents] = useState<SaturnEvent[] | null>(null)
  const [timelineLoading, setTimelineLoading] = useState(false)
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

  const checkDoshas = async () => {
    if (!chart) return
    setDoshaLoading(true)
    setDoshaError(null)
    try {
      const res = await fetch('/api/dosha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planets: chart.planets, ascendant: chart.ascendant }),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`Server error ${res.status}: ${err.slice(0, 120)}`)
      }
      const data = await res.json()
      setDoshaData(data)
      const moonSign = (chart.planets as Record<string, { sign: string }>)?.Moon?.sign
      if (moonSign) fetchSaturnTimeline(moonSign)
    } catch (e) {
      setDoshaError(e instanceof Error ? e.message : 'Failed to check doshas.')
    } finally {
      setDoshaLoading(false)
    }
  }

  const fetchSaturnTimeline = async (moonSign: string) => {
    setTimelineLoading(true)
    try {
      const res = await fetch('/api/saturn-timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ natal_moon_sign: moonSign }),
      })
      const data = await res.json()
      setSaturnEvents(data.events)
    } finally {
      setTimelineLoading(false)
    }
  }

  const tabs = [
    { key: 'interpret', label: t.chart.interpret },
    { key: 'chat', label: t.chart.chat },
    { key: 'dasha', label: t.chart.dasha },
    { key: 'doshas', label: t.doshas.tabLabel },
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

          {activeTab === 'doshas' && (
            <div className="space-y-4">
              <div className="bg-deepblue-900 border border-saffron-700/20 rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-4">{t.doshas.description}</p>
                {!doshaData && (
                  <button
                    onClick={checkDoshas}
                    disabled={doshaLoading}
                    className="bg-saffron-600 hover:bg-saffron-700 text-white font-medium px-5 py-2 rounded-lg transition disabled:opacity-50"
                  >
                    {doshaLoading ? t.doshas.loading : t.doshas.checkBtn}
                  </button>
                )}
                {doshaError && (
                  <p className="text-red-400 text-sm mt-3">{doshaError}</p>
                )}
              </div>

              {doshaData && (
                <div className="space-y-4">
                  <div className={`border rounded-xl p-4 ${doshaData.mangal_dosha.present ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700/40' : 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700/40'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{t.doshas.mangalDosha}</h3>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${doshaData.mangal_dosha.present ? 'border-red-500 bg-red-100 dark:bg-red-900/40' : 'border-green-500 bg-green-100 dark:bg-green-900/40'}`}>
                        {doshaData.mangal_dosha.present ? t.doshas.present : t.doshas.absent}
                      </span>
                    </div>
                    <p className="text-sm mb-1">{t.doshas.marsHouse} {doshaData.mangal_dosha.mars_house}</p>
                    <p className="text-sm mb-1">{t.doshas.severity}: {doshaData.mangal_dosha.severity}</p>
                    <p className="text-gray-400 text-xs">{doshaData.mangal_dosha.description}</p>
                  </div>

                  <div className={`border rounded-xl p-4 ${doshaData.kal_sarpa.present ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700/40' : doshaData.kal_sarpa.partial ? 'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700/40' : 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700/40'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{t.doshas.kalSarpa}</h3>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${doshaData.kal_sarpa.present ? 'border-red-500 bg-red-100 dark:bg-red-900/40' : doshaData.kal_sarpa.partial ? 'border-orange-500 bg-orange-100 dark:bg-orange-900/40' : 'border-green-500 bg-green-100 dark:bg-green-900/40'}`}>
                        {doshaData.kal_sarpa.present ? t.doshas.present : doshaData.kal_sarpa.partial ? t.doshas.partial : t.doshas.absent}
                      </span>
                    </div>
                    {(doshaData.kal_sarpa.present || doshaData.kal_sarpa.partial) && (
                      <p className="text-sm mb-1">{t.doshas.type}: {doshaData.kal_sarpa.type}</p>
                    )}
                    <p className="text-sm mb-1">Rahu: {doshaData.kal_sarpa.rahu_sign} · Ketu: {doshaData.kal_sarpa.ketu_sign}</p>
                  </div>

                  <div className={`border rounded-xl p-4 ${doshaData.sade_sati.active ? 'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700/40' : 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700/40'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{t.doshas.sadeSati}</h3>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${doshaData.sade_sati.active ? 'border-orange-500 bg-orange-100 dark:bg-orange-900/40' : 'border-green-500 bg-green-100 dark:bg-green-900/40'}`}>
                        {doshaData.sade_sati.active ? t.doshas.active : t.doshas.inactive}
                      </span>
                    </div>
                    {doshaData.sade_sati.active && (
                      <>
                        <p className="text-sm mb-1">{t.doshas.phase}: {doshaData.sade_sati.phase}</p>
                        <p className="text-sm mb-1">{t.doshas.yearsRemaining}: {doshaData.sade_sati.years_remaining}</p>
                      </>
                    )}
                    <p className="text-sm mb-1">{t.doshas.natalMoon}: {doshaData.sade_sati.natal_moon_sign}</p>
                    <p className="text-sm mb-1">{t.doshas.currentSaturn}: {doshaData.sade_sati.current_saturn_sign}</p>
                    {doshaData.sade_sati.small_panoti && (
                      <p className="text-sm mt-1 text-yellow-400">⚠ {doshaData.sade_sati.small_panoti_type} Shani (Small Panoti)</p>
                    )}
                  </div>

                  <button
                    onClick={() => { setDoshaData(null); setSaturnEvents(null) }}
                    className="text-saffron-400 hover:text-gold-400 text-sm transition"
                  >
                    ↺ Recheck
                  </button>
                </div>
              )}

              {/* Saturn Transit Timeline */}
              {(saturnEvents || timelineLoading) && (
                <div className="bg-deepblue-900 border border-saffron-700/20 rounded-xl p-4">
                  <h3 className="text-gold-400 font-semibold mb-1 text-sm">Saturn Transit Forecast</h3>
                  <p className="text-gray-500 text-xs mb-4">Sade Sati · Dhaiya · Ashtam Shani — next 35 years</p>
                  {timelineLoading ? (
                    <p className="text-saffron-400 text-sm animate-pulse">Calculating Saturn transits…</p>
                  ) : saturnEvents && saturnEvents.length === 0 ? (
                    <p className="text-gray-500 text-sm">No major Saturn afflictions in the next 35 years.</p>
                  ) : (
                    <div className="space-y-2">
                      {saturnEvents!.map((ev, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-3 rounded-lg px-3 py-2.5 border ${
                            ev.is_current
                              ? ev.intensity === 'high'
                                ? 'border-red-600/50 bg-red-900/20'
                                : 'border-orange-600/50 bg-orange-900/20'
                              : 'border-gray-700/30 bg-gray-900/10'
                          }`}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {ev.is_current ? (
                              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-red-700/40 text-red-300 border border-red-600/40">NOW</span>
                            ) : (
                              <span className="text-xs text-gray-600">—</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm font-semibold ${
                                ev.intensity === 'high' ? 'text-red-300' : 'text-orange-300'
                              }`}>{ev.type}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full border ${
                                ev.phase === 'Peak' ? 'text-red-300 border-red-600/40 bg-red-900/20' :
                                ev.phase === 'Rising' ? 'text-orange-300 border-orange-600/40 bg-orange-900/20' :
                                ev.phase === 'Setting' ? 'text-yellow-300 border-yellow-600/40 bg-yellow-900/20' :
                                'text-gray-300 border-gray-600/40 bg-gray-900/20'
                              }`}>{ev.phase}</span>
                              <span className="text-gray-500 text-xs">Saturn in {ev.sign}</span>
                            </div>
                            <div className="text-gray-500 text-xs mt-0.5">{ev.start} → {ev.end}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-saffron-700/10">
                    <p className="text-gray-600 text-xs">
                      <span className="text-red-400">Sade Sati Peak</span>: Saturn on natal Moon sign (most intense) ·
                      <span className="text-orange-400"> Rising/Setting</span>: adjacent signs ·
                      <span className="text-orange-300"> Dhaiya</span>: 4th from Moon ·
                      <span className="text-orange-300"> Ashtam</span>: 8th from Moon
                    </p>
                  </div>
                </div>
              )}
            </div>
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

'use client'
import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '@/components/LanguageProvider'

interface PujaTiming {
  name: string
  start: string
  end: string
}

interface FestivalDay {
  date: string
  day_of_week: string
  masa: string
  tithi: string
  tithi_num: number
  paksha: string
  nakshatra: string
  festival: string
  special_yogas: string[]
  puja_timings: PujaTiming[]
}

interface GeoResult { name: string; lat: number; lon: number; tz: string }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December']

const YOGA_COLOR: Record<string, string> = {
  'Amrit Siddhi Yoga':     'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  'Sarvaartha Siddhi Yoga':'bg-gold-400/10 text-gold-400 border-gold-400/30',
  'Ravi Pushya Yoga':      'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
  'Guru Pushya Yoga':      'bg-yellow-500/15 text-yellow-800 dark:text-yellow-300 border-yellow-500/30',
  'Dwipushkar Yoga':       'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  'Gand Mool':             'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return `${dt.getDate()} ${MONTHS[m - 1]} ${y}`
}

function fmtShort(iso: string) {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}`
}

// Split festival string by ' · ' and return each as a separate badge
function festivalBadges(festival: string): string[] {
  return festival ? festival.split(' · ').map(f => f.trim()).filter(Boolean) : []
}

const MAJOR_FESTIVALS = new Set([
  'Diwali', 'Ganesh Chaturthi', 'Janmashtami', 'Navratri', 'Dussehra',
  'Holi', 'Ram Navami', 'Maha Shivratri', 'Raksha Bandhan', 'Dhanteras',
  'Guru Purnima', 'Bhai Dooj', 'Akshaya Tritiya', 'Gudi Padwa',
  'Makar Sankranti', 'Baisakhi', 'Dev Diwali', 'Kartik Purnima',
  'Vasant Panchami', 'Govardhan Puja', 'Durgashtami', 'Vijaya Dashami',
])

function isMajor(festival: string): boolean {
  return MAJOR_FESTIVALS.has(festival) ||
    festival.toLowerCase().includes('navratri') ||
    festival.toLowerCase().includes('diwali') ||
    festival.toLowerCase().includes('sankranti')
}

export default function FestivalsPage() {
  const { t } = useLanguage()
  const p = (t as any).festivals

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const [year, setYear] = useState(today.getFullYear())
  const [activeMonth, setActiveMonth] = useState<number | null>(null)  // null = all
  const [locQuery, setLocQuery] = useState('')
  const [geo, setGeo] = useState<GeoResult | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [festivals, setFestivals] = useState<FestivalDay[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Default to London coords so page works before user sets location
  const effectiveGeo = geo || { lat: 51.5074, lon: -0.1278, tz: 'Europe/London', name: 'London, UK' }

  const fetchFestivals = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(
        `/api/festivals?year=${year}&lat=${effectiveGeo.lat}&lon=${effectiveGeo.lon}&tz=${encodeURIComponent(effectiveGeo.tz)}`
      )
      if (!res.ok) throw new Error('Failed to load festival calendar')
      const data = await res.json()
      setFestivals(data.festivals || [])
    } catch {
      setError('Could not load festival calendar.')
    } finally {
      setLoading(false)
    }
  }, [year, effectiveGeo.lat, effectiveGeo.lon, effectiveGeo.tz])

  useEffect(() => { fetchFestivals() }, [fetchFestivals])

  async function searchLocation() {
    if (!locQuery.trim()) return
    setGeoLoading(true)
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(locQuery)}`)
      const d = await res.json()
      setGeo(d)
    } catch { /* ignore */ }
    finally { setGeoLoading(false) }
  }

  // Filter by month
  const filtered = activeMonth === null
    ? festivals
    : festivals.filter(f => parseInt(f.date.split('-')[1]) === activeMonth)

  // Group by month for display
  const byMonth: Record<number, FestivalDay[]> = {}
  filtered.forEach(f => {
    const m = parseInt(f.date.split('-')[1])
    if (!byMonth[m]) byMonth[m] = []
    byMonth[m].push(f)
  })
  const sortedMonths = Object.keys(byMonth).map(Number).sort((a, b) => a - b)

  // Count festivals with actual festival names (not just yogas)
  const festCount = festivals.filter(f => f.festival).length

  return (
    <div className="min-h-screen bg-deepblue-950">
      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gold-400 mb-2">🪔 {p.pageTitle}</h1>
          <p className="text-gray-300 text-sm max-w-xl mx-auto">{p.pageSubtitle}</p>
        </div>

        {/* Controls */}
        <div className="bg-deepblue-900 rounded-2xl p-5 border border-saffron-700/20 mb-6 space-y-4">
          <div className="flex gap-3 flex-wrap items-end">
            {/* Year */}
            <div>
              <label className="block text-xs text-saffron-400/70 mb-1">Year</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setYear(y => y - 1)}
                  className="px-2.5 py-1.5 bg-deepblue-950 border border-saffron-700/30 text-saffron-400 hover:border-gold-400 rounded-lg text-sm transition">◀</button>
                <span className="text-gold-400 font-bold text-lg w-16 text-center">{year}</span>
                <button onClick={() => setYear(y => y + 1)}
                  className="px-2.5 py-1.5 bg-deepblue-950 border border-saffron-700/30 text-saffron-400 hover:border-gold-400 rounded-lg text-sm transition">▶</button>
              </div>
            </div>

            {/* Location */}
            <div className="flex-1 min-w-48">
              <label className="block text-xs text-saffron-400/70 mb-1">{p.locationLabel}</label>
              <div className="flex gap-2">
                <input value={locQuery} onChange={e => setLocQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchLocation()}
                  placeholder={p.locationPlaceholder}
                  className="flex-1 bg-deepblue-950 border border-saffron-700/40 rounded-lg px-3 py-2 text-gray-200 text-sm focus:border-gold-400 focus:outline-none" />
                <button onClick={searchLocation} disabled={geoLoading}
                  className="px-3 py-2 bg-saffron-700/30 hover:bg-saffron-700/50 text-saffron-400 rounded-lg text-sm transition">
                  {geoLoading ? '...' : p.search}
                </button>
              </div>
              {geo && <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">📍 {geo.name}</p>}
            </div>
          </div>

          {/* Stats */}
          {!loading && festivals.length > 0 && (
            <p className="text-xs text-gray-300/60">
              {festCount} festivals · {festivals.filter(f => f.special_yogas.length > 0 && !f.festival).length} yoga-only days · {year}
            </p>
          )}
        </div>

        {/* Month filter tabs */}
        <div className="flex gap-1.5 flex-wrap mb-6">
          <button onClick={() => setActiveMonth(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeMonth === null ? 'bg-saffron-600 text-white' : 'bg-deepblue-900 border border-saffron-700/30 text-saffron-400 hover:border-gold-400'}`}>
            {p.allMonths}
          </button>
          {MONTHS.map((m, i) => (
            <button key={m} onClick={() => setActiveMonth(i + 1)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeMonth === i + 1 ? 'bg-saffron-600 text-white' : 'bg-deepblue-900 border border-saffron-700/30 text-saffron-400 hover:border-gold-400'}`}>
              {m}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16 text-saffron-400/60 text-sm animate-pulse">{p.loading}</div>
        )}

        {error && !loading && (
          <div className="text-center py-8 text-red-700 dark:text-red-400 text-sm">{error}</div>
        )}

        {/* Festival list */}
        {!loading && !error && (
          <div className="space-y-8">
            {sortedMonths.length === 0 && (
              <p className="text-center text-gray-300/60 text-sm py-8">{p.noFestivals}</p>
            )}

            {sortedMonths.map(monthNum => (
              <div key={monthNum}>
                {/* Month heading */}
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-gold-400 font-bold text-lg">{MONTHS_FULL[monthNum - 1]}</h2>
                  <div className="flex-1 h-px bg-saffron-700/20" />
                  <span className="text-xs text-gray-300/40">{byMonth[monthNum].length} days</span>
                </div>

                <div className="space-y-2">
                  {byMonth[monthNum].map((f, i) => {
                    const isToday = f.date === todayStr
                    const badges = festivalBadges(f.festival)
                    const hasMajor = badges.some(isMajor)

                    return (
                      <div key={i} className={`rounded-xl border p-4 transition ${
                        isToday
                          ? 'border-gold-400/60 bg-gold-400/5'
                          : hasMajor
                          ? 'border-saffron-700/40 bg-deepblue-900'
                          : 'border-saffron-700/20 bg-deepblue-900/60'
                      }`}>
                        <div className="flex items-start gap-3">
                          {/* Date column */}
                          <div className="shrink-0 text-center w-14">
                            <div className={`text-2xl font-bold leading-none ${isToday ? 'text-gold-400' : 'text-gray-200'}`}>
                              {parseInt(f.date.split('-')[2])}
                            </div>
                            <div className="text-gray-300/60 text-xs">{f.day_of_week.slice(0, 3)}</div>
                            {isToday && (
                              <div className="mt-1 text-[10px] font-bold text-gold-400 bg-gold-400/10 border border-gold-400/30 rounded px-1">{p.today}</div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            {/* Festival badges */}
                            {badges.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {badges.map((b, j) => (
                                  <span key={j} className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                                    isMajor(b)
                                      ? 'bg-saffron-600/20 text-saffron-400 border-saffron-600/40'
                                      : 'bg-deepblue-800 text-gray-200 border-saffron-700/20 text-[11px]'
                                  }`}>
                                    {b}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Panchang details */}
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-300/60">
                              <span>{f.masa}</span>
                              <span>{f.paksha === 'Shukla' ? 'Shukla' : 'Krishna'} {f.tithi}</span>
                              <span>{f.nakshatra}</span>
                            </div>

                            {/* Special yoga badges */}
                            {f.special_yogas.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {f.special_yogas.map((yoga, k) => (
                                  <span key={k} className={`text-[11px] px-2 py-0.5 rounded-full border ${
                                    YOGA_COLOR[yoga] || 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
                                  }`}>
                                    ✦ {yoga}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Puja timing windows */}
                            {f.puja_timings && f.puja_timings.length > 0 && (
                              <div className="mt-2.5 space-y-1">
                                {f.puja_timings.map((pt, k) => (
                                  <div key={k} className="flex items-center gap-2 text-xs">
                                    <span className="text-saffron-400/70">🕯</span>
                                    <span className="text-gray-300/80 leading-tight">{pt.name}</span>
                                    <span className="ml-auto shrink-0 font-medium text-gold-400 tabular-nums">
                                      {pt.start} – {pt.end}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        {!loading && festivals.length > 0 && (
          <p className="text-xs text-gray-300/30 text-center mt-10 px-4">
            Dates follow the Purnimanta (North Indian) system. Timings are for {geo?.name || 'London, UK'}. Regional observances may differ.
          </p>
        )}
      </div>
    </div>
  )
}

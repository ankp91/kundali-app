'use client'
import { useState, useEffect, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChogSlot {
  name: string; nature: string; start: string; end: string
  active: boolean; overlaps: string[]
}
interface HoraSlot  { hour: number; planet: string; start: string; end: string; active: boolean }
interface VedicTime { ghati: number; pala: number; vipala: number; is_day: boolean; ghati_duration_min: number; sunrise: string; sunset: string }
interface Kalam     { start: string; end: string }

interface Panchang {
  date: string
  masa?: string
  vara:      { name: string; name_hi: string; lord: string }
  tithi:     { name: string; number: number; paksha: string; end_time: string }
  nakshatra: { name: string; name_hi: string; pada: number; end_time: string }
  yoga:      { name: string; number: number }
  karana:    { name: string }
  sunrise: string; sunset: string; moonrise: string
  choghadiya: { day: ChogSlot[]; night: ChogSlot[] }
  hora:       HoraSlot[]
  vedic_time: VedicTime
  kalams: { rahu_kalam: Kalam; yamaganda: Kalam; gulikai: Kalam }
  auspicious: { brahma_muhurta: Kalam; abhijit_muhurta: Kalam; godhuli_muhurta: Kalam }
  samvat: { vikram: number; shaka: number }
  ritu: string; ayana: string; dinamana: string; ratrimana: string
}

interface GeoResult { name: string; lat: number; lon: number; tz: string }
interface LiveVedic { ghati: number; pala: number; vipala: number; isDay: boolean }

interface CalDay {
  date: string; weekday: number; day_of_week: string; tithi: string; tithi_num: number
  nakshatra: string; nakshatra_hi: string; yoga: string; sunrise: string
  is_today: boolean; is_auspicious: boolean
  masa: string; festival: string; paksha: string; vara: string
  rahu_start: string; rahu_end: string
}
interface MuhurtaSlot {
  date: string; day_of_week: string; time_from: string; time_to: string
  choghadiya: string; tithi: string; nakshatra: string; quality: string
  score: number; reasons: string[]
}
// ── Constants ─────────────────────────────────────────────────────────────────

const NATURE_STYLE: Record<string, string> = {
  very_good: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  good:      'bg-green-500/15 text-green-300 border-green-500/30',
  neutral:   'bg-blue-500/15 text-blue-300 border-blue-500/30',
  bad:       'bg-red-500/15 text-red-300 border-red-500/30',
}
const PLANET_COLOR: Record<string, string> = {
  Sun:'#FF8040', Moon:'#C8C8C8', Mercury:'#48C840', Venus:'#FF70B0',
  Mars:'#FF3838', Jupiter:'#FFD700', Saturn:'#6080FF',
}
const OVERLAP_LABEL: Record<string, string> = {
  rahu_kalam: 'Rahu',
  yamaganda:  'Yama',
  gulikai:    'Gulika',
}
const TODAY = new Date().toISOString().slice(0, 10)

// ── Vedic time client-side compute ────────────────────────────────────────────

function computeLiveVedic(sunrise: string, sunset: string, ghatiDurMin: number, tz?: string): LiveVedic {
  const [srH, srM] = sunrise.split(':').map(Number)
  const [ssH, ssM] = sunset.split(':').map(Number)
  const now     = new Date()
  let nowMin: number
  if (tz) {
    const parts = new Intl.DateTimeFormat('en', { timeZone: tz, hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false }).formatToParts(now)
    const h = Number(parts.find(p => p.type === 'hour')?.value ?? 0)
    const m = Number(parts.find(p => p.type === 'minute')?.value ?? 0)
    const s = Number(parts.find(p => p.type === 'second')?.value ?? 0)
    nowMin = h * 60 + m + s / 60
  } else {
    nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60
  }
  const srMin   = srH * 60 + srM
  const ssMin   = ssH * 60 + ssM
  const dayMins   = ssMin - srMin
  const nightMins = 1440 - dayMins
  const isDay     = nowMin >= srMin && nowMin <= ssMin

  // Dynamic 30+30 system: 30 Ghati daytime + 30 Ghati nighttime = 60 total
  let ghatiF: number
  if (isDay) {
    ghatiF = ((nowMin - srMin) / dayMins) * 30
  } else if (nowMin > ssMin) {
    ghatiF = 30 + ((nowMin - ssMin) / nightMins) * 30
  } else {
    // Before sunrise — continuation of previous night
    ghatiF = 30 + ((nowMin - ssMin + 1440) / nightMins) * 30
  }
  const ghati   = Math.max(0, Math.floor(ghatiF))
  const palaF   = (ghatiF - Math.floor(Math.max(0, ghatiF))) * 60
  const pala    = Math.max(0, Math.floor(palaF))
  const vipala  = Math.max(0, Math.floor((palaF - Math.floor(palaF)) * 60))
  return { ghati, pala, vipala, isDay }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PanchangPage() {
  const [date, setDate]         = useState(TODAY)
  const [query, setQuery]       = useState('')
  const [location, setLocation] = useState<GeoResult | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError]     = useState('')
  const [data, setData]         = useState<Panchang | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [activeTab, setActiveTab] = useState<'panchang'|'choghadiya'|'hora'|'vedic'|'calendar'|'muhurta'>('panchang')

  // Calendar state
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1)
  const [calData, setCalData] = useState<CalDay[]>([])
  const [calLoading, setCalLoading] = useState(false)
  const [selectedDay, setSelectedDay] = useState<CalDay | null>(null)
  const [selectedDayFull, setSelectedDayFull] = useState<Record<string, unknown> | null>(null)
  const [dayDetailLoading, setDayDetailLoading] = useState(false)

  // Muhurta state
  const [muhurtaActivity, setMuhurtaActivity] = useState('business')
  const [muhurtaFrom, setMuhurtaFrom] = useState(TODAY)
  const [muhurtaTo, setMuhurtaTo] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0,10) })
  const [muhurtaResults, setMuhurtaResults] = useState<MuhurtaSlot[]>([])
  const [muhurtaLoading, setMuhurtaLoading] = useState(false)
  const [liveVedic, setLiveVedic] = useState<LiveVedic | null>(null)

  const fetchPanchang = useCallback(async (loc: GeoResult, d: string) => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({ date: d, lat: String(loc.lat), lon: String(loc.lon), tz: loc.tz })
      const res = await fetch(`/api/panchang?${params}`)
      if (!res.ok) throw new Error(await res.text())
      setData(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load panchang')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const defaultLoc: GeoResult = { name: 'London, UK', lat: 51.5074, lon: -0.1278, tz: 'Europe/London' }
    setLocation(defaultLoc)
    fetchPanchang(defaultLoc, TODAY)
  }, [fetchPanchang])

  // Auto-update Vedic Time every second
  useEffect(() => {
    if (!data) return
    const { sunrise, sunset, ghati_duration_min } = data.vedic_time
    const tz = location?.tz
    const tick = () => setLiveVedic(computeLiveVedic(sunrise, sunset, ghati_duration_min, tz))
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [data, location])

  useEffect(() => {
    if (activeTab === 'calendar' && location && calData.length === 0) {
      fetchCalendar(location, calYear, calMonth)
    }
  }, [activeTab, location])

  useEffect(() => {
    if (!selectedDay || !location) { setSelectedDayFull(null); return }
    setDayDetailLoading(true)
    const params = new URLSearchParams({ date: selectedDay.date, lat: String(location.lat), lon: String(location.lon), tz: location.tz })
    fetch(`/api/panchang?${params}`)
      .then(r => r.json())
      .then(setSelectedDayFull)
      .catch(() => setSelectedDayFull(null))
      .finally(() => setDayDetailLoading(false))
  }, [selectedDay])

  const searchLocation = async () => {
    if (!query.trim()) return
    setGeoLoading(true); setGeoError('')
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error('Location not found')
      const loc: GeoResult = await res.json()
      setLocation(loc); setQuery('')
      fetchPanchang(loc, date)
    } catch (e: unknown) {
      setGeoError(e instanceof Error ? e.message : 'Location not found')
    } finally {
      setGeoLoading(false)
    }
  }

  const onDateChange = (d: string) => {
    setDate(d)
    if (location) fetchPanchang(location, d)
  }

  const fetchCalendar = async (loc: GeoResult, y: number, m: number) => {
    setCalLoading(true)
    try {
      const params = new URLSearchParams({ date: `${y}-${String(m).padStart(2,'0')}`, lat: String(loc.lat), lon: String(loc.lon), tz: loc.tz })
      const res = await fetch(`/api/panchang/monthly?${params}`)
      setCalData(await res.json())
    } catch { setCalData([]) }
    setCalLoading(false)
  }

  const navigateCalendar = (delta: number) => {
    if (!location) return
    let m = calMonth + delta
    let y = calYear
    if (m < 1) { m = 12; y -= 1 }
    if (m > 12) { m = 1; y += 1 }
    setCalMonth(m)
    setCalYear(y)
    fetchCalendar(location, y, m)
  }

  const fetchMuhurta = async () => {
    if (!location) return
    setMuhurtaLoading(true)
    try {
      const res = await fetch('/api/muhurta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity: muhurtaActivity, date_from: muhurtaFrom, date_to: muhurtaTo, lat: location.lat, lon: location.lon, tz: location.tz }),
      })
      setMuhurtaResults(await res.json())
    } catch { setMuhurtaResults([]) }
    setMuhurtaLoading(false)
  }

  const tabs = [
    { key: 'panchang',   label: 'Panchang' },
    { key: 'choghadiya', label: 'Choghadiya' },
    { key: 'hora',       label: 'Hora' },
    { key: 'vedic',      label: 'Vedic Time' },
    { key: 'calendar',   label: '📅 Calendar' },
    { key: 'muhurta',    label: '✨ Muhurta' },
  ] as const

  return (
    <div className="min-h-screen bg-deepblue-950 text-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gold-400">🪔 Daily Panchang</h1>
          <p className="text-saffron-400/70 text-sm mt-1">Tithi · Nakshatra · Yoga · Karana · Choghadiya · Hora · Vedic Time</p>
        </div>

        {/* Controls */}
        <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 min-w-0">
              <label className="text-xs text-saffron-400/70 block mb-1">Date</label>
              <input
                type="date" value={date}
                onChange={e => onDateChange(e.target.value)}
                className="w-full max-w-full bg-deepblue-800 border border-saffron-700/30 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-gold-400 [color-scheme:dark]"
              />
            </div>
            <div className="flex-[2]">
              <label className="text-xs text-saffron-400/70 block mb-1">Location</label>
              <div className="flex gap-2">
                <input
                  type="text" value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchLocation()}
                  placeholder="Search city (e.g. Mumbai, India)"
                  className="flex-1 bg-deepblue-800 border border-saffron-700/30 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gold-400 [color-scheme:dark]"
                />
                <button
                  onClick={searchLocation} disabled={geoLoading}
                  className="px-4 py-2 bg-saffron-600/20 border border-saffron-600/40 rounded-lg text-sm text-saffron-300 hover:bg-saffron-600/30 transition disabled:opacity-50"
                >
                  {geoLoading ? '...' : 'Set'}
                </button>
              </div>
              {geoError && <p className="text-red-400 text-xs mt-1">{geoError}</p>}
              {location && <p className="text-gray-500 text-xs mt-1 truncate">📍 {location.name}</p>}
            </div>
          </div>
        </div>

        {loading && <div className="text-center py-12 text-saffron-400/60">Loading panchang…</div>}
        {error   && <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-4 text-red-300 text-sm">{error}</div>}

        {data && !loading && (
          <>
            {/* Tab bar */}
            <div className="flex flex-wrap gap-1.5">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    activeTab === tab.key
                      ? 'bg-saffron-600/30 text-gold-400 border border-saffron-600/50'
                      : 'text-saffron-400/70 hover:text-gold-400 border border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Panchang tab ─────────────────────────────────────────────── */}
            {activeTab === 'panchang' && (
              <div className="space-y-4">
                {/* Sun/Moon times */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Sunrise 🌅', value: data.sunrise },
                    { label: 'Sunset 🌇',  value: data.sunset  },
                    { label: 'Moonrise 🌙', value: data.moonrise },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-deepblue-900 border border-saffron-700/20 rounded-xl p-3 text-center">
                      <div className="text-xs text-saffron-400/60 mb-1">{label}</div>
                      <div className="text-xl font-bold text-gold-400">{value}</div>
                    </div>
                  ))}
                </div>

                {/* Five elements */}
                <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-saffron-700/20">
                    <h2 className="text-gold-400 font-bold text-sm">
                      {data.date} — {data.vara.name}{' '}
                      <span className="text-saffron-400/60 font-normal">({data.vara.name_hi})</span>
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">Lord of the day: {data.vara.lord}</p>
                  </div>
                  <div className="divide-y divide-saffron-700/10">
                    {[
                      { label: 'Tithi',     value: `${data.tithi.paksha} ${data.tithi.name}`,   end: data.tithi.end_time,     sub: `${data.tithi.number}/30` },
                      { label: 'Nakshatra', value: data.nakshatra.name,                          end: data.nakshatra.end_time, sub: `${data.nakshatra.name_hi} · Pada ${data.nakshatra.pada}` },
                      { label: 'Yoga',      value: data.yoga.name,                               end: '',                      sub: `${data.yoga.number}/27` },
                      { label: 'Karana',    value: data.karana.name,                             end: '',                      sub: 'Half-Tithi' },
                    ].map(({ label, value, end, sub }) => (
                      <div key={label} className="flex items-center justify-between px-4 py-3">
                        <span className="text-saffron-400/70 text-sm w-24">{label}</span>
                        <div className="text-right">
                          <div className="text-gray-100 font-medium text-sm">{value}</div>
                          <div className="text-gray-500 text-xs">
                            {sub}
                            {end && <span className="ml-2 text-saffron-400/60">upto {end}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Seasonal info */}
                <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-saffron-700/20">
                    <h3 className="text-gold-400 font-bold text-sm">Samvat & Seasonal Info</h3>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-saffron-700/10">
                    {[
                      { label: 'Vikram Samvat', value: String(data.samvat.vikram) },
                      { label: 'Shaka Samvat',  value: String(data.samvat.shaka)  },
                      { label: 'Ritu',          value: data.ritu                  },
                      { label: 'Ayana',         value: data.ayana                 },
                      { label: 'Dinamana',      value: data.dinamana              },
                      { label: 'Ratrimana',     value: data.ratrimana             },
                    ].map(({ label, value }) => (
                      <div key={label} className="px-4 py-2.5 flex items-center justify-between">
                        <span className="text-saffron-400/70 text-xs">{label}</span>
                        <span className="text-gray-100 text-sm font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Inauspicious timings */}
                <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-saffron-700/20">
                    <h3 className="text-red-400 font-bold text-sm">⚠ Inauspicious Timings</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Avoid important activities during these periods</p>
                  </div>
                  <div className="divide-y divide-saffron-700/10">
                    {[
                      { label: 'Rahu Kalam',     desc: 'Most inauspicious — ruled by Rahu',     ...data.kalams.rahu_kalam, color: 'text-red-400' },
                      { label: 'Yamaganda',      desc: 'Ruled by Yama — inauspicious',           ...data.kalams.yamaganda,  color: 'text-orange-400' },
                      { label: 'Gulikai Kalam',  desc: 'Ruled by Saturn — avoid new ventures',  ...data.kalams.gulikai,    color: 'text-yellow-500' },
                    ].map(({ label, desc, start, end, color }) => (
                      <div key={label} className="flex items-center justify-between px-4 py-2.5">
                        <div>
                          <span className={`text-sm font-medium ${color}`}>{label}</span>
                          <p className="text-gray-500 text-xs">{desc}</p>
                        </div>
                        <span className="text-gray-300 text-sm font-mono">{start} – {end}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Auspicious timings */}
                <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-saffron-700/20">
                    <h3 className="text-emerald-400 font-bold text-sm">✨ Auspicious Timings</h3>
                  </div>
                  <div className="divide-y divide-saffron-700/10">
                    {[
                      { label: 'Brahma Muhurta', desc: '96-48 min before sunrise — ideal for prayers & meditation', ...data.auspicious.brahma_muhurta },
                      { label: 'Abhijit Muhurta', desc: 'Solar noon ±24 min — powerful for important tasks',        ...data.auspicious.abhijit_muhurta },
                      { label: 'Godhuli Muhurta', desc: 'Sunset ±12 min — auspicious twilight period',              ...data.auspicious.godhuli_muhurta },
                    ].map(({ label, desc, start, end }) => (
                      <div key={label} className="flex items-center justify-between px-4 py-2.5">
                        <div>
                          <span className="text-sm font-medium text-emerald-300">{label}</span>
                          <p className="text-gray-500 text-xs">{desc}</p>
                        </div>
                        <span className="text-gray-300 text-sm font-mono">{start} – {end}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Choghadiya tab ───────────────────────────────────────────── */}
            {activeTab === 'choghadiya' && (
              <div className="space-y-4">
                <div className="bg-deepblue-900/60 border border-saffron-700/20 rounded-xl p-3 text-xs text-gray-400">
                  <span className="font-medium text-saffron-400">Choghadiya</span> divides each day/night into 8 equal slots.
                  Use <span className="text-emerald-300">Amrit, Shubh, Labh</span> for important work.
                  <span className="text-red-400 ml-1">⊗ Rahu</span> / <span className="text-orange-400">⊗ Yama</span> / <span className="text-yellow-500">⊗ Gulika</span> indicate overlapping inauspicious periods — even good Choghadiya is weakened.
                </div>
                {(['day', 'night'] as const).map(period => (
                  <div key={period} className="bg-deepblue-900 border border-saffron-700/30 rounded-xl overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-saffron-700/20">
                      <h3 className="text-gold-400 font-bold text-sm">
                        {period === 'day' ? '☀ Day Choghadiya' : '🌙 Night Choghadiya'}
                        <span className="ml-2 text-gray-500 font-normal text-xs">
                          {period === 'day'
                            ? `Sunrise ${data.sunrise}`
                            : `Sunset ${data.sunset}`}
                        </span>
                      </h3>
                    </div>
                    <div className="divide-y divide-saffron-700/10">
                      {data.choghadiya[period].map((slot, i) => (
                        <div key={i} className={`flex items-center gap-2 px-4 py-2.5 ${slot.active ? 'bg-saffron-600/10' : ''}`}>
                          <span className="text-gray-600 text-xs w-4">{i + 1}</span>
                          <div className="flex-1 flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium px-2 py-0.5 rounded border ${NATURE_STYLE[slot.nature]}`}>
                              {slot.name}
                            </span>
                            {slot.active && <span className="text-xs text-gold-400 font-bold">← Now</span>}
                            {/* Overlap warnings */}
                            {slot.overlaps?.map(k => (
                              <span
                                key={k}
                                title={`This slot overlaps with ${k === 'rahu_kalam' ? 'Rahu Kalam' : k === 'yamaganda' ? 'Yamaganda Kalam' : 'Gulikai Kalam'} — even good Choghadiya is weakened`}
                                className={`text-xs font-bold px-1.5 py-0.5 rounded border ${
                                  k === 'rahu_kalam'
                                    ? 'text-red-400 border-red-500/40 bg-red-500/10'
                                    : k === 'yamaganda'
                                    ? 'text-orange-400 border-orange-500/40 bg-orange-500/10'
                                    : 'text-yellow-500 border-yellow-500/40 bg-yellow-500/10'
                                }`}
                              >
                                ⊗ {OVERLAP_LABEL[k]}
                              </span>
                            ))}
                          </div>
                          <span className="text-gray-400 text-xs whitespace-nowrap">{slot.start} – {slot.end}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Kalam quick ref */}
                <div className="bg-deepblue-900/60 border border-saffron-700/20 rounded-xl p-3 space-y-1.5">
                  <p className="text-xs text-saffron-400 font-medium mb-2">Today&apos;s Inauspicious Periods</p>
                  {[
                    { label: 'Rahu Kalam', color: 'text-red-400',    ...data.kalams.rahu_kalam },
                    { label: 'Yamaganda',  color: 'text-orange-400', ...data.kalams.yamaganda  },
                    { label: 'Gulikai',    color: 'text-yellow-500', ...data.kalams.gulikai    },
                  ].map(({ label, color, start, end }) => (
                    <div key={label} className="flex justify-between text-xs">
                      <span className={`font-medium ${color}`}>{label}</span>
                      <span className="text-gray-400 font-mono">{start} – {end}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Hora tab ─────────────────────────────────────────────────── */}
            {activeTab === 'hora' && (
              <div className="space-y-4">
                <div className="bg-deepblue-900/60 border border-saffron-700/20 rounded-xl p-3 text-xs text-gray-400">
                  <span className="font-medium text-saffron-400">Hora</span> — Each day has 24 planetary hours starting from sunrise. Work aligned with the ruling planet is more effective.
                </div>
                <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl overflow-hidden">
                  <div className="divide-y divide-saffron-700/10">
                    {data.hora.map((h, i) => (
                      <div key={i} className={`flex items-center gap-3 px-4 py-2 ${h.active ? 'bg-saffron-600/10' : ''}`}>
                        <span className="text-gray-500 text-xs w-6">{h.hour}</span>
                        <span className="text-sm font-bold w-20" style={{ color: PLANET_COLOR[h.planet] || '#aaa' }}>
                          {h.planet}
                        </span>
                        {h.active && <span className="text-xs text-gold-400 font-bold">← Now</span>}
                        <span className="ml-auto text-gray-400 text-xs">{h.start} – {h.end}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Vedic Time tab ───────────────────────────────────────────── */}
            {activeTab === 'vedic' && (
              <div className="space-y-4">
                {/* Live time display */}
                <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-6 text-center">
                  <p className="text-saffron-400/60 text-xs mb-2">Current Vedic Time (live)</p>
                  {liveVedic ? (
                    <>
                      <div className="text-4xl font-bold text-gold-400 tabular-nums">
                        {liveVedic.ghati} <span className="text-2xl">Ghati</span>{' '}
                        {liveVedic.pala} <span className="text-2xl">Pala</span>{' '}
                        {liveVedic.vipala} <span className="text-2xl">Vipala</span>
                      </div>
                      <p className="text-gray-500 text-xs mt-2">
                        {liveVedic.isDay ? '☀ Day time (from sunrise)' : '🌙 Night time'}
                      </p>
                    </>
                  ) : (
                    <div className="text-4xl font-bold text-gold-400">
                      {data.vedic_time.ghati} Ghati {data.vedic_time.pala} Pala {data.vedic_time.vipala} Vipala
                    </div>
                  )}
                  <p className="text-saffron-400/50 text-xs mt-1">
                    Sunrise {data.vedic_time.sunrise} · Sunset {data.vedic_time.sunset}
                    {' '}· 1 Ghati ≈ {(() => {
                    const [srH2, srM2] = data.vedic_time.sunrise.split(':').map(Number)
                    const [ssH2, ssM2] = data.vedic_time.sunset.split(':').map(Number)
                    const dMins = (ssH2 * 60 + ssM2) - (srH2 * 60 + srM2)
                    const dur = liveVedic?.isDay ? dMins / 30 : (1440 - dMins) / 30
                    return dur.toFixed(1)
                  })()} mins {liveVedic?.isDay ? 'today' : 'tonight'}
                  </p>
                  {/* Tithi details row — like Drik Panchang */}
                  <div className="mt-3 pt-3 border-t border-saffron-700/20 text-sm text-gray-300">
                    {data.masa && <>{data.masa} · </>}{data.tithi.paksha} {data.tithi.name}
                    <span className="mx-2 text-saffron-700/50">·</span>
                    {data.samvat.vikram} Vikrama Samvat
                    <span className="mx-2 text-saffron-700/50">·</span>
                    {data.vara.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Nakshatra: {data.nakshatra.name} ({data.nakshatra.name_hi}) · Yoga: {data.yoga.name}
                  </div>
                  <div className="text-xs text-saffron-400/40 mt-2">
                    {(() => {
                      const [srH3, srM3] = data.vedic_time.sunrise.split(':').map(Number)
                      const [ssH3, ssM3] = data.vedic_time.sunset.split(':').map(Number)
                      const dMins = (ssH3 * 60 + ssM3) - (srH3 * 60 + srM3)
                      const nMins = 1440 - dMins
                      return `Ghati length varies by season · day: ${(dMins / 30).toFixed(1)} min · night: ${(nMins / 30).toFixed(1)} min`
                    })()}
                  </div>
                </div>

                {/* Explanation */}
                <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-saffron-700/20">
                    <h3 className="text-gold-400 font-bold text-sm">Understanding Vedic Time</h3>
                  </div>
                  <div className="divide-y divide-saffron-700/10">
                    {[
                      { unit: 'Ghati (घटी)',     value: '= 24 minutes',   desc: 'A day has 60 Ghati from sunrise to sunrise. The traditional Vedic hour.' },
                      { unit: 'Pala (पल)',        value: '= 24 seconds',   desc: '1 Ghati = 60 Pala. Used for finer time divisions in muhurta.' },
                      { unit: 'Vipala (विपल)',    value: '= 0.4 seconds',  desc: '1 Pala = 60 Vipala. The most precise standard Vedic time unit.' },
                      { unit: 'Kashtha',          value: '= 1.6 seconds',  desc: '1 Kashtha = 4 Vipala. Mentioned in ancient texts like Surya Siddhanta.' },
                      { unit: 'Muhurta',          value: '= 48 minutes',   desc: '1 Muhurta = 2 Ghati. A day has 30 Muhurtas — used for auspicious timing.' },
                    ].map(({ unit, value, desc }) => (
                      <div key={unit} className="px-4 py-3">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-saffron-400 font-medium text-sm">{unit}</span>
                          <span className="text-gold-400 text-xs font-bold">{value}</span>
                        </div>
                        <p className="text-gray-400 text-xs">{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-deepblue-900/60 border border-saffron-700/20 rounded-xl p-3 text-xs text-gray-400">
                  <span className="text-saffron-400 font-medium">Note:</span> Unlike clock time, Vedic Ghati is relative to sunrise/sunset — its duration in minutes changes with the season and location. Today a Ghati is {data.vedic_time.ghati_duration_min} min at your location.
                </div>
              </div>
            )}

            {/* Calendar Tab */}
            {activeTab === 'calendar' && (
              <div className="space-y-4">
                <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <button
                      onClick={() => navigateCalendar(-1)}
                      disabled={calLoading || !location}
                      className="w-9 h-9 flex items-center justify-center bg-deepblue-800 border border-saffron-700/30 hover:border-gold-400 text-saffron-400 hover:text-gold-400 rounded-lg text-lg transition disabled:opacity-40"
                      title="Previous month"
                    >‹</button>
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                      <select value={calMonth} onChange={e => setCalMonth(Number(e.target.value))} className="flex-1 bg-deepblue-800 border border-saffron-700/30 rounded-lg px-3 py-2 text-sm text-gray-100 [color-scheme:dark]">
                        {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                      </select>
                      <input type="number" value={calYear} onChange={e => setCalYear(Number(e.target.value))} className="w-24 bg-deepblue-800 border border-saffron-700/30 rounded-lg px-3 py-2 text-sm text-gray-100 [color-scheme:dark]" />
                    </div>
                    <button
                      onClick={() => navigateCalendar(1)}
                      disabled={calLoading || !location}
                      className="w-9 h-9 flex items-center justify-center bg-deepblue-800 border border-saffron-700/30 hover:border-gold-400 text-saffron-400 hover:text-gold-400 rounded-lg text-lg transition disabled:opacity-40"
                      title="Next month"
                    >›</button>
                    <button onClick={() => location && fetchCalendar(location, calYear, calMonth)} disabled={calLoading || !location} className="px-4 py-2 bg-saffron-700/20 border border-saffron-600/40 text-saffron-400 hover:text-gold-400 rounded-lg text-sm transition disabled:opacity-50">
                      {calLoading ? 'Loading...' : 'Go'}
                    </button>
                  </div>
                  {calData.length > 0 && (
                    <>
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                          <div key={d} className="text-center text-xs text-saffron-400/70 font-medium py-1">{d}</div>
                        ))}
                      </div>
                      {(() => {
                        const firstDay = calData[0]?.weekday ?? 0
                        const cells: (CalDay | null)[] = Array(firstDay).fill(null).concat(calData)
                        while (cells.length % 7 !== 0) cells.push(null)
                        const weeks = []
                        for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i+7))
                        return weeks.map((week, wi) => (
                          <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
                            {week.map((day, di) => (
                              <div
                                key={di}
                                onClick={() => day && setSelectedDay(selectedDay?.date === day.date ? null : day)}
                                className={`rounded-xl p-2 min-h-[80px] border text-xs cursor-pointer transition-all ${
                                  day?.date === selectedDay?.date ? 'border-gold-400 bg-gold-400/10' :
                                  day?.is_today ? 'border-saffron-500/60 bg-saffron-600/10' :
                                  day?.is_auspicious ? 'border-green-500/30 bg-green-500/5' :
                                  day ? 'border-saffron-700/20 bg-deepblue-950/50 hover:border-saffron-600/40' :
                                  'border-transparent'
                                }`}
                              >
                                {day && (
                                  <>
                                    <div className="font-bold text-base text-gray-100">{new Date(day.date + 'T12:00:00').getDate()}</div>
                                    <div className="text-[10px] text-saffron-400 leading-tight mt-0.5">
                                      {day.paksha === 'Krishna' ? 'K' : 'S'} {day.tithi_num}
                                    </div>
                                    <div className="text-[10px] text-gray-500 leading-tight truncate">{day.nakshatra}</div>
                                    {day.festival && (
                                      <div className="mt-1 text-[9px] bg-gold-400/20 text-gold-400 px-1 py-0.5 rounded leading-tight line-clamp-2">
                                        {day.festival.split('·')[0].trim()}
                                      </div>
                                    )}
                                    {day.is_today && <div className="text-[9px] text-saffron-400 font-bold mt-0.5">Today</div>}
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        ))
                      })()}
                      <div className="mt-3 flex gap-4 text-xs text-gray-500">
                        <span><span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-1" />Auspicious</span>
                        <span><span className="inline-block w-2 h-2 rounded-full bg-saffron-400 mr-1" />Today</span>
                        <span><span className="inline-block w-2 h-2 rounded-full bg-gold-400 mr-1" />Selected</span>
                        <span className="text-saffron-400/60">K=Krishna · S=Shukla</span>
                      </div>

                      {/* Day detail panel */}
                      {selectedDay && (() => {
                        const f = selectedDayFull
                        const tithi    = f ? (f.tithi    as Record<string,unknown>) : null
                        const nak      = f ? (f.nakshatra as Record<string,unknown>) : null
                        const yoga     = f ? (f.yoga     as Record<string,unknown>) : null
                        const karana   = f ? (f.karana   as Record<string,unknown>) : null
                        const samvat   = f ? (f.samvat   as Record<string,unknown>) : null
                        const kalams   = f ? (f.kalams   as Record<string,Record<string,string>>) : null
                        const ausp     = f ? (f.auspicious as Record<string,Record<string,string>>) : null
                        const vara     = f ? (f.vara     as Record<string,string>) : null
                        return (
                        <div className="mt-4 bg-deepblue-950 border border-gold-400/30 rounded-xl p-4 space-y-3">
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <h3 className="text-gold-400 font-bold text-sm">
                              {new Date(selectedDay.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </h3>
                            <button onClick={() => setSelectedDay(null)} className="text-gray-500 hover:text-gray-300 text-lg leading-none">✕</button>
                          </div>

                          {dayDetailLoading && <div className="text-saffron-400 text-xs animate-pulse">Loading full details…</div>}

                          {/* Festival */}
                          {selectedDay.festival && (
                            <div className="bg-gold-400/10 border border-gold-400/30 rounded-lg px-3 py-2">
                              <span className="text-gold-400 text-sm font-medium">🎉 {selectedDay.festival}</span>
                            </div>
                          )}

                          {/* Sun / Moon times */}
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { icon: '🌅', label: 'Sunrise',  value: (f?.sunrise as string) || selectedDay.sunrise },
                              { icon: '🌇', label: 'Sunset',   value: (f?.sunset  as string) || '—' },
                              { icon: '🌕', label: 'Moonrise', value: (f?.moonrise as string) || '—' },
                            ].map(({ icon, label, value }) => (
                              <div key={label} className="bg-deepblue-900/60 rounded-lg px-2 py-2 text-center">
                                <div className="text-lg">{icon}</div>
                                <div className="text-saffron-400/60 text-[10px]">{label}</div>
                                <div className="text-gray-200 text-xs font-medium mt-0.5">{value}</div>
                              </div>
                            ))}
                          </div>

                          {/* Samvat */}
                          {samvat && (
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-deepblue-900/60 rounded-lg px-3 py-2">
                                <div className="text-saffron-400/60 text-[10px]">Vikram Samvat</div>
                                <div className="text-gray-200 text-xs font-medium mt-0.5">{samvat.vikram as number}</div>
                              </div>
                              <div className="bg-deepblue-900/60 rounded-lg px-3 py-2">
                                <div className="text-saffron-400/60 text-[10px]">Shaka Samvat</div>
                                <div className="text-gray-200 text-xs font-medium mt-0.5">{samvat.shaka as number}</div>
                              </div>
                            </div>
                          )}

                          {/* Panchang details */}
                          <div className="space-y-1.5">
                            {[
                              { label: 'Masa (Purnimanta)', value: selectedDay.masa || '—' },
                              { label: 'Paksha',  value: selectedDay.paksha },
                              { label: 'Vara',    value: vara ? `${vara.name} (${vara.lord})` : (selectedDay.vara || selectedDay.day_of_week) },
                              { label: 'Tithi',   value: tithi ? `${tithi.paksha} ${tithi.name} · upto ${tithi.end_time}` : `${selectedDay.paksha} ${selectedDay.tithi}` },
                              { label: 'Nakshatra', value: nak ? `${nak.name} (${nak.name_hi}) Pada ${nak.pada} · upto ${nak.end_time}` : `${selectedDay.nakshatra} (${selectedDay.nakshatra_hi})` },
                              { label: 'Yoga',    value: yoga ? `${yoga.name} · upto ${(f?.vedic_time as Record<string,unknown> | null)?.ghati ?? ''}` : selectedDay.yoga },
                              { label: 'Karana',  value: karana ? (karana.name as string) : '—' },
                              { label: 'Ritu',    value: (f?.ritu as string) || '—' },
                              { label: 'Ayana',   value: (f?.ayana as string) || '—' },
                            ].map(({ label, value }) => (
                              <div key={label} className="flex items-baseline justify-between py-1 border-b border-saffron-700/10">
                                <span className="text-saffron-400/70 text-xs w-32 shrink-0">{label}</span>
                                <span className="text-gray-200 text-xs text-right">{String(value)}</span>
                              </div>
                            ))}
                          </div>

                          {/* Kalams */}
                          {kalams && (
                            <div>
                              <div className="text-saffron-400/60 text-[10px] uppercase tracking-wide mb-1.5">Inauspicious Periods</div>
                              <div className="grid grid-cols-1 gap-1">
                                {[
                                  { label: 'Rahu Kalam',  start: kalams.rahu_kalam?.start,  end: kalams.rahu_kalam?.end },
                                  { label: 'Yamaganda',   start: kalams.yamaganda?.start,   end: kalams.yamaganda?.end },
                                  { label: 'Gulikai',     start: kalams.gulikai?.start,     end: kalams.gulikai?.end },
                                ].map(({ label, start, end }) => (
                                  <div key={label} className="flex justify-between bg-red-900/10 border border-red-700/20 rounded px-2 py-1">
                                    <span className="text-red-300/80 text-xs">{label}</span>
                                    <span className="text-gray-300 text-xs">{start} – {end}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Auspicious timings */}
                          {ausp && (
                            <div>
                              <div className="text-saffron-400/60 text-[10px] uppercase tracking-wide mb-1.5">Auspicious Timings</div>
                              <div className="grid grid-cols-1 gap-1">
                                {[
                                  { label: 'Brahma Muhurta', start: ausp.brahma_muhurta?.start,  end: ausp.brahma_muhurta?.end },
                                  { label: 'Abhijit',        start: ausp.abhijit_muhurta?.start, end: ausp.abhijit_muhurta?.end },
                                  { label: 'Godhuli',        start: ausp.godhuli_muhurta?.start, end: ausp.godhuli_muhurta?.end },
                                ].map(({ label, start, end }) => (
                                  <div key={label} className="flex justify-between bg-green-900/10 border border-green-700/20 rounded px-2 py-1">
                                    <span className="text-green-300/80 text-xs">{label}</span>
                                    <span className="text-gray-300 text-xs">{start} – {end}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Tags */}
                          <div className="flex gap-2 flex-wrap">
                            {selectedDay.is_auspicious && <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded-full">✓ Auspicious</span>}
                            {selectedDay.tithi_num === 11 && <span className="text-xs bg-saffron-600/20 text-saffron-400 border border-saffron-600/30 px-2 py-1 rounded-full">🙏 Ekadashi</span>}
                            {selectedDay.tithi_num === 26 && <span className="text-xs bg-saffron-600/20 text-saffron-400 border border-saffron-600/30 px-2 py-1 rounded-full">🙏 Ekadashi</span>}
                            {selectedDay.tithi_num === 15 && <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-1 rounded-full">🌕 Purnima</span>}
                            {selectedDay.tithi_num === 30 && <span className="text-xs bg-gray-500/20 text-gray-400 border border-gray-500/30 px-2 py-1 rounded-full">🌑 Amavasya</span>}
                          </div>
                        </div>
                        )
                      })()}
                    </>
                  )}
                  {!location && <p className="text-gray-500 text-sm text-center py-4">Set a location first to view monthly panchang.</p>}
                </div>
              </div>
            )}

            {/* Muhurta Tab */}
            {activeTab === 'muhurta' && (
              <div className="space-y-4">
                <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-6">
                  <h3 className="text-gold-400 font-bold text-lg mb-4">✨ Muhurta Finder</h3>
                  <p className="text-gray-500 text-sm mb-4">Find auspicious dates for important activities based on tithi, nakshatra, vara, and choghadiya.</p>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-xs text-saffron-400/70 block mb-1">Activity</label>
                      <select value={muhurtaActivity} onChange={e => setMuhurtaActivity(e.target.value)} className="w-full bg-deepblue-800 border border-saffron-700/30 rounded-lg px-3 py-2 text-sm text-gray-100 [color-scheme:dark]">
                        <option value="marriage">Marriage / Engagement</option>
                        <option value="business">Business Start</option>
                        <option value="travel">Travel</option>
                        <option value="medical">Medical / Surgery</option>
                        <option value="purchase">Purchase / Investment</option>
                        <option value="education">Education / Learning</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-saffron-400/70 block mb-1">From</label>
                        <input type="date" value={muhurtaFrom} onChange={e => setMuhurtaFrom(e.target.value)} className="w-full bg-deepblue-800 border border-saffron-700/30 rounded-lg px-3 py-2 text-sm text-gray-100 [color-scheme:dark]" />
                      </div>
                      <div>
                        <label className="text-xs text-saffron-400/70 block mb-1">To</label>
                        <input type="date" value={muhurtaTo} onChange={e => setMuhurtaTo(e.target.value)} className="w-full bg-deepblue-800 border border-saffron-700/30 rounded-lg px-3 py-2 text-sm text-gray-100 [color-scheme:dark]" />
                      </div>
                    </div>
                  </div>
                  <button onClick={fetchMuhurta} disabled={muhurtaLoading || !location} className="w-full py-3 bg-saffron-600/20 border border-saffron-600/40 text-saffron-400 hover:text-gold-400 hover:border-gold-400 rounded-lg text-sm transition disabled:opacity-50">
                    {muhurtaLoading ? 'Finding auspicious dates...' : '🔍 Find Muhurta'}
                  </button>
                  {!location && <p className="text-gray-500 text-xs mt-2 text-center">Set a location first.</p>}
                </div>
                {muhurtaResults.length > 0 && (
                  <div className="space-y-3">
                    {muhurtaResults.map((m, i) => (
                      <div key={i} className={`bg-deepblue-900 border rounded-xl p-4 ${m.quality === 'excellent' ? 'border-gold-400/40' : 'border-green-500/30'}`}>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-gray-200 font-bold">{m.date}</span>
                          <span className="text-gray-400 text-sm">{m.day_of_week}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${m.quality === 'excellent' ? 'bg-gold-400/20 text-gold-400' : 'bg-green-500/20 text-green-400'}`}>{m.quality.toUpperCase()}</span>
                        </div>
                        <div className="flex gap-4 text-sm text-gray-400 mb-2">
                          <span>⏰ {m.time_from}{m.time_to ? ` – ${m.time_to}` : ''}</span>
                          <span className="text-saffron-400">{m.choghadiya}</span>
                        </div>
                        <div className="text-xs text-gray-500 mb-2">{m.tithi} · {m.nakshatra}</div>
                        <div className="flex flex-wrap gap-1">
                          {m.reasons.map((r, ri) => (
                            <span key={ri} className="text-xs bg-deepblue-950/70 border border-saffron-700/20 text-saffron-400/80 px-2 py-0.5 rounded-full">{r}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {muhurtaResults.length === 0 && !muhurtaLoading && (
                  <p className="text-gray-500 text-sm text-center">No results yet. Set your activity and date range, then click Find Muhurta.</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

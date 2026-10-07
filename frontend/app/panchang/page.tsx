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

function computeLiveVedic(sunrise: string, sunset: string, ghatiDurMin: number): LiveVedic {
  const [srH, srM] = sunrise.split(':').map(Number)
  const [ssH, ssM] = sunset.split(':').map(Number)
  const now     = new Date()
  const nowMin  = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60
  const srMin   = srH * 60 + srM
  const ssMin   = ssH * 60 + ssM
  const dayMins = ssMin - srMin
  const isDay   = nowMin >= srMin && nowMin <= ssMin

  const elapsed = nowMin - srMin
  const ghatiF  = dayMins > 0 ? (elapsed / dayMins) * 60 : 0
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
    const tick = () => setLiveVedic(computeLiveVedic(sunrise, sunset, ghati_duration_min))
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [data])

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
          <div className="flex flex-col sm:flex-row gap-3 overflow-hidden">
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
            <div className="flex gap-2 overflow-x-auto pb-1">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition ${
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
                    {' '}· 1 Ghati = {data.vedic_time.ghati_duration_min} min today
                  </p>
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
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <select value={calMonth} onChange={e => setCalMonth(Number(e.target.value))} className="bg-deepblue-800 border border-saffron-700/30 rounded-lg px-3 py-2 text-sm text-gray-100 [color-scheme:dark]">
                      {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                    </select>
                    <input type="number" value={calYear} onChange={e => setCalYear(Number(e.target.value))} className="w-24 bg-deepblue-800 border border-saffron-700/30 rounded-lg px-3 py-2 text-sm text-gray-100 [color-scheme:dark]" />
                    <button onClick={() => location && fetchCalendar(location, calYear, calMonth)} disabled={calLoading || !location} className="px-4 py-2 bg-saffron-700/20 border border-saffron-600/40 text-saffron-400 hover:text-gold-400 rounded-lg text-sm transition disabled:opacity-50">
                      {calLoading ? 'Loading...' : 'View Month'}
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
                              <div key={di} className={`rounded-lg p-1.5 min-h-[64px] border text-xs ${
                                day?.is_today ? 'border-gold-400/60 bg-gold-400/10' :
                                day?.is_auspicious ? 'border-green-500/30 bg-green-500/5' :
                                'border-saffron-700/20 bg-deepblue-950/50'
                              }`}>
                                {day && (
                                  <>
                                    <div className="font-bold text-gray-200">{new Date(day.date).getDate()}</div>
                                    <div className="text-gray-500 text-[10px] leading-tight truncate">{day.tithi}</div>
                                    <div className="text-gray-600 text-[10px] leading-tight truncate">{day.nakshatra}</div>
                                    {day.is_auspicious && <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-0.5" />}
                                    {day.is_today && <div className="text-gold-400 text-[10px] font-bold">Today</div>}
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        ))
                      })()}
                      <div className="mt-3 flex gap-4 text-xs text-gray-500">
                        <span><span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-1" />Auspicious day</span>
                        <span><span className="inline-block w-2 h-2 rounded-full bg-gold-400 mr-1" />Today</span>
                      </div>
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
